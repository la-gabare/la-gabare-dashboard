// Le connecteur Harness Maxxing ne doit jamais casser l'admin.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { notifier, enTexte } from '@/lib/notifier'

test('sans MAXXING_FEED_URL : aucun appel réseau', async () => {
  delete process.env.MAXXING_FEED_URL
  const f = globalThis.fetch
  let appels = 0
  globalThis.fetch = (async () => { appels++; return new Response('') }) as typeof fetch
  await notifier({ titre: 'test' })
  globalThis.fetch = f
  assert.equal(appels, 0)
})

test('avec URL : envoie le JSON attendu par le webhook du feed', async () => {
  process.env.MAXXING_FEED_URL = 'https://example.test/hook'
  const f = globalThis.fetch
  let corps: Record<string, unknown> = {}
  globalThis.fetch = (async (_u: unknown, init?: RequestInit) => { corps = JSON.parse(String(init?.body)); return new Response('') }) as typeof fetch
  await notifier({ titre: 'Nouveau lead', corps: 'x', niveau: 'warning', id: 'lead-1' })
  globalThis.fetch = f
  delete process.env.MAXXING_FEED_URL
  assert.deepEqual(corps, { title: 'Nouveau lead', body: 'x', level: 'warning', id: 'lead-1' })
})

test('un feed injoignable ne lève pas d\'erreur', async () => {
  process.env.MAXXING_FEED_URL = 'https://example.test/hook'
  const f = globalThis.fetch
  globalThis.fetch = (async () => { throw new Error('réseau coupé') }) as typeof fetch
  await assert.doesNotReject(notifier({ titre: 'test' }))
  globalThis.fetch = f
  delete process.env.MAXXING_FEED_URL
})

test('enTexte retire le HTML', () => {
  assert.equal(enTexte('<p>Paiement <b>reçu</b></p>'), 'Paiement reçu')
})
