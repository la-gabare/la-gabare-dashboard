// Notifications vers Harness Maxxing (tableau de bord + Telegram) : webhook « Generic JSON » du feed.
// Variable Vercel : MAXXING_FEED_URL (URL du webhook, saisie par l'utilisateur). Absente = rien n'est envoyé.
// Ne lève jamais d'erreur et ne passe jamais par console.error (sinon boucle avec lib/alertes.ts).

export type NiveauNotif = 'info' | 'success' | 'warning' | 'error'

export interface Notif {
  titre: string
  corps?: string
  niveau?: NiveauNotif
  url?: string
  /** Même identifiant deux fois = une seule notification (évite les doublons) */
  id?: string
}

const DELAI_MS = 3000

export async function notifier(n: Notif): Promise<void> {
  const cible = process.env.MAXXING_FEED_URL
  if (!cible) return
  try {
    await fetch(cible, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: n.titre.slice(0, 200),
        body: n.corps?.slice(0, 3500),
        level: n.niveau || 'info',
        url: n.url,
        id: n.id,
      }),
      signal: AbortSignal.timeout(DELAI_MS),
    })
  } catch { /* le feed est un confort : son indisponibilité ne doit rien casser */ }
}

/** Texte brut d'un contenu HTML court (pour le corps d'une notification) */
export function enTexte(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Nom du domaine d'un client (pour titrer une notification) ; jamais d'erreur */
export async function nomClient(id: number | string): Promise<string> {
  try {
    const { supabaseAdmin } = await import('@/lib/supabase-admin')
    const { data } = await supabaseAdmin.from('clients').select('nom_domaine').eq('id', id).single()
    return data?.nom_domaine || `client n° ${id}`
  } catch { return `client n° ${id}` }
}

export const eurosCourt = (cents: number) => `${(cents / 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`
