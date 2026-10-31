import './charger.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { validerProspect } from '@/lib/prospects-hm'

test('prospect valide : champs nettoyés, stade par défaut', () => {
  const r = validerProspect({ slug: 'domaine-x', nom: ' Domaine X ', siren: '330 140 369', inconnu: 'ignoré' })
  assert.ok(r.ok)
  if (r.ok) { assert.equal(r.prospect.nom, 'Domaine X'); assert.equal(r.prospect.siren, '330140369'); assert.equal(r.prospect.stade, 'prospect'); assert.ok(!('inconnu' in r.prospect)) }
})

test('refus : slug, stade, siren invalides ou corps vide', () => {
  for (const b of [null, { nom: 'X' }, { slug: '../x', nom: 'X' }, { slug: 'x', nom: 'X', stade: 'client_vip' }, { slug: 'x', nom: 'X', siren: '12' }]) {
    assert.equal(validerProspect(b).ok, false)
  }
})

test('texte trop long tronqué', () => {
  const r = validerProspect({ slug: 'x', nom: 'X', brouillon_email: 'a'.repeat(20000) })
  assert.ok(r.ok)
  if (r.ok) assert.equal(r.prospect.brouillon_email?.length, 8000)
})

import { prochaineAction, STADES } from '@/lib/prospects-hm'
test('chaque stade actif a une prochaine action, « abandonné » aucune', () => {
  for (const s of STADES) assert.equal(prochaineAction(s) === null, s === 'abandonne')
})
