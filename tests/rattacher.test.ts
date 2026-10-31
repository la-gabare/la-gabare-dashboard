import './charger.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { trouverProspect, noyau } from '@/lib/rattacher'

const P = [
  { id: 1, nom: 'Domaine Champalou', stade: 'pret' },
  { id: 2, nom: 'Domaine de la Châtaigneraie', stade: 'prospect' },
  { id: 3, nom: 'Domaine Bouchet', stade: 'pret' },
  { id: 4, nom: 'Domaine des Bouchets Vignoble', stade: 'pret' },
]

test('noyau : accents, mots vides et casse ignorés', () => {
  assert.equal(noyau('DOMAINE de la Châtaigneraie'), 'chataigneraie')
})

test('rattachement : nom identique ou variante, insensible aux accents', () => {
  assert.equal(trouverProspect('champalou', P)?.id, 1)
  assert.equal(trouverProspect('Domaine de la Chataigneraie', P)?.id, 2)
})

test('rattachement prudent : inconnu, trop court ou ambigu = aucun', () => {
  assert.equal(trouverProspect('Domaine Inconnu', P), null)
  assert.equal(trouverProspect('Dom', P), null)
  assert.equal(trouverProspect('', P), null)
  assert.equal(trouverProspect(null, P), null)
  assert.equal(trouverProspect('Bouchet', P), null)
})
