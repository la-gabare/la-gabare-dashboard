import 'server-only'
import { createHash, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const DUREE_ACCES_JOURS = 30

export const ACTIVITES = ['caviste', 'restaurant', 'hôtel', 'épicerie fine', 'export', 'autre']

export function empreinte(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex')
}

// Nouveau lien d'accès : le jeton n'est envoyé que par e-mail, seule son empreinte est stockée
export async function nouvelAcces(proId: number): Promise<string> {
  const jeton = randomBytes(32).toString('base64url')
  const expire = new Date(Date.now() + DUREE_ACCES_JOURS * 864e5).toISOString()
  const { error } = await supabaseAdmin.from('pros')
    .update({ acces_hash: empreinte(jeton), acces_expire_at: expire })
    .eq('id', proId)
  if (error) throw new Error(error.message)
  return jeton
}

export function lienAcces(siteBase: string, jeton: string): string {
  return `${siteBase}/professionnels.html?acces=${encodeURIComponent(jeton)}`
}

// Pro authentifié par son lien (en-tête Authorization: Bearer <jeton>)
export async function proDepuisRequete(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  if (!h.startsWith('Bearer ')) return { erreur: 'Accès professionnel requis', status: 401 as const }
  const jeton = h.slice(7).trim()
  if (jeton.length < 30) return { erreur: 'Lien d\'accès invalide', status: 401 as const }
  const { data: pro } = await supabaseAdmin.from('pros')
    .select('id, client_id, email, entreprise, nom, statut, acces_expire_at')
    .eq('acces_hash', empreinte(jeton))
    .maybeSingle()
  if (!pro || pro.statut !== 'valide') return { erreur: 'Lien d\'accès invalide ou révoqué', status: 401 as const }
  if (!pro.acces_expire_at || new Date(pro.acces_expire_at) < new Date()) {
    return { erreur: 'Lien d\'accès expiré : demandez-en un nouveau', status: 401 as const }
  }
  await supabaseAdmin.from('pros').update({ derniere_connexion_at: new Date().toISOString() }).eq('id', pro.id)
  return { pro }
}
