// Gabarit des mails de contenu : dates, échappement HTML, pas de caractère exotique.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mailContenu, esc } from '@/lib/mails-contenu-html'

const base = { surtitre: 's', titre: 't', intro: 'i', pied: 'p', bouton: 'Ouvrir', lien: 'https://la-gabare.fr/espace-client.html' }

test('mail de contenu : une ligne par contenu, avec jour et type', () => {
  const html = mailContenu({ ...base, lignes: [
    { date: '2026-10-27', type: 'Article', titre: 'Vendanges', valide: true },
    { date: '2026-10-28', type: 'Publication', titre: 'Instagram · post' }] })
  assert.match(html, />27</)
  assert.match(html, /Article · mardi · validé/)
  assert.match(html, /Publication · mercredi/)
  assert.match(html, /href="https:\/\/la-gabare\.fr\/espace-client\.html"/)
})

test('mail de contenu : un titre malveillant est échappé', () => {
  const html = mailContenu({ ...base, lignes: [{ date: '2026-10-27', type: 'Article', titre: '<script>x</script>' }] })
  assert.ok(!html.includes('<script>'))
  assert.equal(esc('a&b"c'), 'a&amp;b&quot;c')
})
