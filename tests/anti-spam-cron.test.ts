// Anti-spam des formulaires publics, jeton du lien du brief et isolation des tâches du cron relances.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ressembleAUnRobot, jetonBrief, jetonBriefValide, lienBrief } from '@/lib/anti-spam'
import { executerTaches } from '@/lib/cron-relances'

test('piège rempli = robot', () => {
  assert.equal(ressembleAUnRobot({ site_web: 'http://spam' }), true)
  assert.equal(ressembleAUnRobot({}), false)
})

test('délai minimal : trop rapide ou date absurde = robot, absent = accepté (transition)', () => {
  const now = 1_000_000_000_000
  assert.equal(ressembleAUnRobot({ ouvert_a: now - 500 }, now), true)
  assert.equal(ressembleAUnRobot({ ouvert_a: now - 10_000 }, now), false)
  assert.equal(ressembleAUnRobot({ ouvert_a: 'abc' }, now), true)
  assert.equal(ressembleAUnRobot({ ouvert_a: now - 3 * 24 * 3600 * 1000 }, now), true)
})

test('jeton du brief : lié au numéro du lead, sans secret aucun jeton', () => {
  delete process.env.BRIEF_TOKEN_SECRET
  assert.equal(jetonBrief(12), null)
  assert.equal(jetonBriefValide(12, 'x'), false)
  assert.equal(lienBrief(12), 'https://la-gabare.fr/formulaire-complet.html?lead_id=12')
  process.env.BRIEF_TOKEN_SECRET = 'secret-de-test'
  const k = jetonBrief(12)!
  assert.equal(jetonBriefValide(12, k), true)
  assert.equal(jetonBriefValide(13, k), false)
  assert.equal(jetonBriefValide(12, undefined), false)
  assert.equal(jetonBriefValide(12, k.slice(1)), false)
  assert.equal(lienBrief(12), `https://la-gabare.fr/formulaire-complet.html?lead_id=12&k=${k}`)
  assert.equal(lienBrief(null), 'https://la-gabare.fr/formulaire-complet.html')
  delete process.env.BRIEF_TOKEN_SECRET
})

test('cron : une tâche en échec n\'arrête pas les suivantes', async () => {
  const err = console.error
  console.error = () => {}
  const r = await executerTaches([
    { nom: 'a', run: async () => ({ ok: 1 }) },
    { nom: 'b', run: async () => { throw new Error('boum') } },
    { nom: 'c', run: async () => ({ ok: 3 }) },
  ], 10_000)
  console.error = err
  assert.deepEqual(r.echecs, ['b'])
  assert.deepEqual(r.resultats.c, { ok: 3 })
})

test('cron : budget de temps dépassé = tâches reportées, pas exécutées', async () => {
  let lance = false
  const r = await executerTaches([{ nom: 'tard', run: async () => { lance = true } }], 1000, Date.now() - 5000)
  assert.deepEqual(r.reportees, ['tard'])
  assert.equal(lance, false)
})
