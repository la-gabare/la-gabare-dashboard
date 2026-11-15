import { test } from 'node:test'
import assert from 'node:assert/strict'
import { htmlMailPresentation, messagePresentation, LIEN_SITE, LIEN_AUDIT } from '@/lib/mail-presentation'

test('message type : signé Alexandre, sans prix ni offre', () => {
  const m = messagePresentation('Domaine X')
  assert.ok(m.includes('Je suis Alexandre') && m.includes('[Une phrase personnelle sur Domaine X.]'))
  assert.ok(!/€|pack|abonnement|Louis/i.test(m))
})

test('mail : liens site et audit, mention stop, texte échappé', () => {
  const html = htmlMailPresentation('Bonjour <b>x</b>')
  assert.ok(html.includes(`href="${LIEN_SITE}"`) && html.includes(`href="${LIEN_AUDIT}"`))
  assert.ok(html.includes('« stop »') && html.includes('&lt;b&gt;x&lt;/b&gt;'))
})
