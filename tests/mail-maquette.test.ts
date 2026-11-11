import { test } from 'node:test'
import assert from 'node:assert/strict'
import { EMAIL_RE, htmlMailMaquette, messageParDefaut, messageEnHtml } from '@/lib/mail-maquette'

const pr = { nom: 'Domaine <Test>', appellation: 'Vouvray', commune: 'Rochecorbon' }

test('message type : nom, appellation, commune et phrase à personnaliser', () => {
  const m = messageParDefaut(pr)
  assert.ok(m.includes('Domaine <Test> (Vouvray, Rochecorbon)') && m.includes('[Ajoutez ici'))
})

test('mail : texte échappé, images et signature prévues, lien seulement si démo en ligne', () => {
  const html = htmlMailMaquette(pr, 'Bonjour\n\nVoici <b>x</b>', { srcBureau: 'cid:maquette-bureau' })
  assert.ok(html.includes('Domaine &lt;Test&gt;') && html.includes('&lt;b&gt;x&lt;/b&gt;'))
  assert.ok(html.includes('src="cid:maquette-bureau"') && !html.includes('Voir la maquette en ligne'))
  assert.ok(htmlMailMaquette(pr, 'a', { lien: 'https://demo.exemple.fr' }).includes('href="https://demo.exemple.fr"'))
  assert.equal(messageEnHtml('a\n\nb').split('<p ').length, 3)
})

test('adresse : refuse les séparateurs et en-têtes injectés', () => {
  assert.ok(EMAIL_RE.test('contact@domaine.fr'))
  for (const mauvais of ['a@b', 'a@b.fr, c@d.fr', 'a@b.fr\nBcc: x@y.fr', 'a b@c.fr']) assert.ok(!EMAIL_RE.test(mauvais), mauvais)
})
