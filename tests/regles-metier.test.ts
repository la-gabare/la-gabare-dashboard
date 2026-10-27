// Règles métier de La Gabare (prix, échéancier, devis, mois offerts, CGV d'abonnement).
// Lancer : npm test — si une règle change volontairement, mettre à jour le test ET le harness (1-contexte/offres.md).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decouper, PRIX_PACKS, FORMULES } from '@/lib/paiements/echeancier'
import { calculer, CATALOGUE } from '@/lib/paiements/devis'
import { ACCOMPAGNEMENT_INCLUS, finMoisOfferts } from '@/lib/paiements/accompagnement-offert'
import { dates, sortieAnticipee, ENGAGEMENT_MOIS, PREAVIS_MOIS, INDEMNITE_PCT } from '@/lib/abonnement-cgv'

const somme = (l: { montant_cents: number }[]) => l.reduce((s, e) => s + e.montant_cents, 0)
const PRIX_ABONNEMENTS: Record<string, number> = { village: 150, reserve: 350, grand_cru: 550 }

test('prix des packs : 1 990 / 4 490 / 6 990 €, identiques dans l\'échéancier et le devis', () => {
  assert.deepEqual(PRIX_PACKS, { essentiel: 1990, pro: 4490, premium: 6990 })
  for (const p of Object.keys(PRIX_PACKS)) assert.equal(CATALOGUE[p].prix, PRIX_PACKS[p], `catalogue ${p}`)
})

test('échéancier 40 / 30 / 30 (CGV) sur le Pack Pro', () => {
  const v = decouper(449000, '3x')
  assert.deepEqual(v.map((e) => e.montant_cents), [179600, 134700, 134700])
  assert.deepEqual(v.map((e) => e.libelle), ['Acompte à la commande', 'Validation de la maquette', 'Mise en ligne'])
})

test('échéancier 50 / 50 et paiement en une fois', () => {
  assert.deepEqual(decouper(199000, '2x').map((e) => e.montant_cents), [99500, 99500])
  assert.deepEqual(decouper(699000, '1x').map((e) => e.montant_cents), [699000])
})

test('échéancier : aucun centime perdu sur un montant qui ne tombe pas rond', () => {
  for (const total of [100001, 333333, 199999]) for (const f of Object.keys(FORMULES)) assert.equal(somme(decouper(total, f)), total)
})

test('échéancier : liens de paiement uniques et formule inconnue refusée', () => {
  const v = decouper(449000, '3x')
  assert.equal(new Set(v.map((e) => e.token)).size, 3)
  assert.throws(() => decouper(1000, '4x'))
})

test('devis : franchise de TVA (0 %) → TTC = HT', () => {
  const r = calculer([{ libelle: 'Pack Pro', montant_ht_cents: 449000 }], '3x', 0, 0)
  assert.deepEqual(r, { brut: 449000, remise: 0, ht: 449000, tva: 0, ttc: 449000 })
})

test('devis : la remise ne s\'applique qu\'au paiement en une fois', () => {
  const lignes = [{ libelle: 'Pack Essentiel', montant_ht_cents: 199000 }, { libelle: 'Option audit', montant_ht_cents: 25000 }]
  assert.equal(calculer(lignes, '1x', 5, 0).remise, 11200)
  assert.equal(calculer(lignes, '3x', 5, 0).remise, 0)
  assert.equal(calculer(lignes, '1x', 0, 20).ttc, 268800)
})

test('chaque pack inclut 3 mois de son abonnement, et le devis annonce la bonne valeur', () => {
  const attendu = { essentiel: 'village', pro: 'reserve', premium: 'grand_cru' }
  for (const [pack, formule] of Object.entries(attendu)) {
    assert.equal(ACCOMPAGNEMENT_INCLUS[pack].formule, formule)
    assert.equal(ACCOMPAGNEMENT_INCLUS[pack].mois, 3)
    const valeur = (3 * PRIX_ABONNEMENTS[formule]).toLocaleString('fr-FR').replace(/\s/g, ' ')
    assert.ok(CATALOGUE[pack].detail.replace(/\s/g, ' ').includes(`valeur ${valeur} €`), `${pack} : « valeur ${valeur} € »`)
    assert.ok(CATALOGUE[pack].detail.includes('3 mois'), pack)
  }
})

test('fin des mois offerts : début + 3 mois, + mois gagnés par parrainage', () => {
  assert.equal(finMoisOfferts({ pack_site: 'Pro', date_debut_abonnement: '2026-11-01T00:00:00Z' })?.toISOString().slice(0, 10), '2027-02-01')
  assert.equal(finMoisOfferts({ pack_site: 'essentiel', date_debut_abonnement: '2026-11-01T00:00:00Z', mois_offerts_bonus: 1 })?.toISOString().slice(0, 10), '2027-03-01')
  assert.equal(finMoisOfferts({ pack_site: null, date_debut_abonnement: '2026-11-01' }), null)
  assert.equal(finMoisOfferts({ pack_site: 'pro', date_debut_abonnement: null }), null)
})

test('CGV abonnement : 12 mois d\'engagement, préavis 2 mois, sortie anticipée à 50 %', () => {
  assert.equal(ENGAGEMENT_MOIS, 12)
  assert.equal(PREAVIS_MOIS, 2)
  assert.equal(INDEMNITE_PCT, 50)
})

test('résiliation pendant l\'engagement : effet à la fin des 12 mois', () => {
  const { effet } = dates({ date_debut_abonnement: '2026-01-15T12:00:00Z' }, null, new Date('2026-03-01T12:00:00Z'))
  assert.equal(effet.toISOString().slice(0, 10), '2027-01-15')
})

test('résiliation après l\'engagement : effet après 2 mois de préavis', () => {
  const { effet } = dates({ date_debut_abonnement: '2025-01-01T12:00:00Z' }, null, new Date('2026-06-10T12:00:00Z'))
  assert.equal(effet.toISOString().slice(0, 10), '2026-08-10')
})

test('sortie anticipée : 50 % des mensualités restantes (Village, 9 mois restants)', () => {
  const sub = { items: { data: [{ current_period_end: Date.parse('2026-04-15T12:00:00Z') / 1000, price: { unit_amount: 15000 } }] } } as any
  assert.deepEqual(sortieAnticipee(sub, new Date('2027-01-15T12:00:00Z')), { mois_restants: 9, indemnite_cents: 67500 })
  assert.equal(sortieAnticipee(sub, new Date('2026-04-15T12:00:00Z')), null)
  assert.equal(sortieAnticipee(null, new Date()), null)
})

test('engagement : les 12 mois partent du début de l\'accompagnement, pas de l\'enregistrement de la carte', () => {
  const sub = { start_date: Math.floor(new Date('2026-03-15T12:00:00Z').getTime() / 1000) } as any
  const { finEngagement } = dates({ date_debut_abonnement: '2026-01-15T12:00:00Z' }, sub, new Date('2026-04-01T12:00:00Z'))
  assert.equal(finEngagement?.toISOString().slice(0, 10), '2027-01-15')
})
