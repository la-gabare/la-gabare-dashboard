import { test } from 'node:test'
import assert from 'node:assert/strict'
import { gabaritMail, MARQUE_SIGNATURE, MARQUE_SANS_SIGNATURE } from '@/lib/mail-cadre'
import { avecSignature, SIGNATURE_HTML } from '@/lib/signature-mail'
import { paymentLinkEmail } from '@/lib/mail-paiement'

test('gabarit : charte (bandeau, label, titre, bouton, pied), sans flex ni SVG', () => {
  const html = gabaritMail({ label: 'Votre paiement', titre: 'Titre', corps: '<p>Corps</p>', bouton: { texte: 'Payer', lien: 'https://exemple.fr' } })
  for (const attendu of ['#EDE9E2', '#2A0810', 'Votre paiement', 'font-size:30px', 'href="https://exemple.fr"', 'Agence web pour domaines viticoles'])
    assert.ok(html.includes(attendu), attendu)
  assert.ok(!/display:\s*flex|<svg/i.test(html))
})

test('signature automatique placée DANS la carte, une seule fois', () => {
  const html = avecSignature(gabaritMail({ label: 'L', titre: 'T', corps: '' }), 'client@exemple.fr', 'La Gabare')
  assert.equal(html.split(SIGNATURE_HTML).length, 2)
  assert.ok(html.indexOf(SIGNATURE_HTML) < html.indexOf('Agence web pour domaines viticoles'))
  assert.ok(!html.includes(MARQUE_SIGNATURE))
})

test('bloc « À très vite » : pas de signature automatique en plus', () => {
  const html = avecSignature(gabaritMail({ label: 'L', titre: 'T', corps: '', signature: 'a-tres-vite' }), 'client@exemple.fr', 'La Gabare')
  assert.ok(html.includes('À très vite,'))
  assert.ok(!html.includes(SIGNATURE_HTML))
  assert.ok(html.includes(MARQUE_SANS_SIGNATURE))
})

test('mail au nom d\'un autre expéditeur : marqueur retiré, pas de signature', () => {
  const html = avecSignature(gabaritMail({ label: 'L', titre: 'T', corps: '' }), 'client@exemple.fr', 'La Gabare — Boutique')
  assert.ok(!html.includes(SIGNATURE_HTML) && !html.includes(MARQUE_SIGNATURE))
})

test('lien de paiement : modèle Paiement (montant, projet, bouton)', () => {
  const html = paymentLinkEmail('Domaine Exemple', 1990, 'site', 'https://pay.exemple')
  assert.match(html, /finalisons votre commande/)
  assert.match(html, /Montant/)
  assert.match(html, /Procéder au paiement/)
  assert.match(html, /href="https:\/\/pay\.exemple"/)
})
