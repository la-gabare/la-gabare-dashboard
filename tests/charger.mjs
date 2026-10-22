// Chargeur des tests : résout les imports `@/…` et les chemins sans extension (.ts), et remplace par des
// doublures les modules qui parleraient à Stripe, Supabase ou au serveur mail (aucun appel réel pendant les tests).
import { register } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

if (!globalThis.__gabareCharge) {
  globalThis.__gabareCharge = true
  register(import.meta.url)
}

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOUBLURE = pathToFileURL(path.join(RACINE, 'tests', 'doublures.mjs')).href
const SIMULES = new Set(['server-only', '@/lib/stripe', '@/lib/supabase-admin', '@/lib/mailer', '@/lib/plan-editorial'])

function avecExtension(fichier) {
  for (const f of [fichier, fichier + '.ts', fichier + '.tsx', path.join(fichier, 'index.ts')]) {
    if (existsSync(f) && !f.endsWith(path.sep)) return f
  }
  return null
}

export async function resolve(specifier, context, suivant) {
  if (SIMULES.has(specifier)) return { url: DOUBLURE, shortCircuit: true }
  let cible = null
  if (specifier.startsWith('@/')) cible = path.join(RACINE, specifier.slice(2))
  else if ((specifier.startsWith('.') || specifier.startsWith('/')) && context.parentURL?.startsWith('file:'))
    cible = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier)
  if (cible) {
    const trouve = avecExtension(cible)
    if (trouve) return { url: pathToFileURL(trouve).href, shortCircuit: true }
  }
  return suivant(specifier, context)
}
