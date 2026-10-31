import './charger.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { construireADecider } from '@/lib/a-decider'

const NOW = new Date('2026-10-31T10:00:00Z').getTime()
const il_y_a = (j: number) => new Date(NOW - j * 86400000).toISOString()
const vide = { leads: [], devis: [], echeances: [], textes: [], taches: [], noms_clients: { 1: 'Domaine Test' } }

test('nouveau lead = haute urgence, lead récent sans réponse ignoré', () => {
  const r = construireADecider({ ...vide, leads: [
    { id: 1, domaine: 'A', statut: 'reception', created_at: il_y_a(1) },
    { id: 2, domaine: 'B', statut: 'mail_envoye', created_at: il_y_a(5), mail_envoye_at: il_y_a(1) },
  ] }, NOW)
  assert.equal(r.length, 1)
  assert.equal(r[0].urgence, 'haute')
})

test('devis relancé après 5 jours seulement', () => {
  const r = construireADecider({ ...vide, devis: [
    { id: 1, client_id: 1, numero: 'D-1', envoye_at: il_y_a(4), created_at: il_y_a(4) },
    { id: 2, client_id: 1, numero: 'D-2', envoye_at: il_y_a(6), created_at: il_y_a(6) },
  ] }, NOW)
  assert.deepEqual(r.map((x) => x.titre), ['Domaine Test — devis D-2'])
})

test('tri : haute avant normale, et aucun e-mail dans la sortie', () => {
  const r = construireADecider({ ...vide, textes: [{ client_id: 1, type: 'article' }], taches: [{ id: 1, titre: 'T', priorite: 'haute' }] }, NOW)
  assert.equal(r[0].type, 'tache')
  assert.ok(!JSON.stringify(r).includes('@'))
})
