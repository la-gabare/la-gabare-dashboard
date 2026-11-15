import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LIMITE_JOUR, debutJourneeParis, lireCsv, messageAPersonnaliser, restantAujourdhui, sqlImport } from '@/lib/campagne'

test('plafond : 30 par jour, jamais négatif', () => {
  assert.equal(restantAujourdhui(0), LIMITE_JOUR)
  assert.equal(restantAujourdhui(12), 18)
  assert.equal(restantAujourdhui(99), 0)
})

test('journée : minuit à Paris (hiver UTC+1, été UTC+2)', () => {
  assert.equal(debutJourneeParis(new Date('2026-11-14T10:30:00Z')).toISOString(), '2026-11-13T23:00:00.000Z')
  assert.equal(debutJourneeParis(new Date('2026-07-14T10:30:00Z')).toISOString(), '2026-07-13T22:00:00.000Z')
  assert.equal(debutJourneeParis(new Date('2026-11-13T23:30:00Z')).toISOString(), '2026-11-13T23:00:00.000Z')
})

test('message : refuse une phrase entre crochets restante', () => {
  assert.ok(messageAPersonnaliser('Bonjour\n[Une phrase personnelle sur X.]'))
  assert.ok(!messageAPersonnaliser('Bonjour, belle journée'))
})

test('CSV : guillemets, adresses invalides écartées, SQL échappé et idempotent', () => {
  const csv = 'nom;appellation;commune;site;email;telephone;source;indices\nDomaine d\'Or;Vouvray;Rochecorbon;http://a.fr;Contact@A.fr;;src;"un; deux"\nSans mail;Chinon;X;;;;;\nMauvais;X;X;;a@b;;;\n'
  const l = lireCsv(csv)
  assert.equal(l.length, 1)
  assert.equal(l[0].email, 'contact@a.fr')
  assert.equal(l[0].indices, 'un; deux')
  const sql = sqlImport(l)
  assert.ok(sql.includes("'Domaine d''Or'") && sql.includes('on conflict (campagne, lower(email)) do nothing'))
})
