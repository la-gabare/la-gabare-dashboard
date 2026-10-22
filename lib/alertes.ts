import crypto from 'crypto'
import { waitUntil } from '@vercel/functions'

// Alertes d'erreur : chaque console.error côté serveur est enregistré (table erreurs) et l'agence reçoit
// un e-mail à la première occurrence, puis au plus une fois toutes les 6 heures pour la même erreur.
// Installé une fois par instance depuis instrumentation.ts.

const DELAI_REALERTE_MS = 6 * 60 * 60 * 1000
// Messages sans gravité (bruit) : non signalés
const IGNORER = [/Missing signature or webhook secret/i, /ECONNRESET/i]
let installe = false
// Anti-rafale par instance (si la table erreurs est absente ou injoignable)
const dernieresAlertes = new Map<string, number>()
let enCours = false // évite qu'une erreur pendant l'alerte ne déclenche une nouvelle alerte

function texteDe(args: unknown[]) {
  return args.map((a) => {
    if (a instanceof Error) return `${a.name}: ${a.message}${a.stack ? `\n${a.stack.split('\n').slice(1, 6).join('\n')}` : ''}`
    if (typeof a === 'string') return a
    try { return JSON.stringify(a) } catch { return String(a) }
  }).join(' ').slice(0, 4000)
}

async function signaler(message: string) {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  const { sendMail } = await import('@/lib/mailer')
  // Signature stable : on retire chiffres, identifiants et dates pour regrouper les mêmes erreurs
  const premiereLigne = message.split('\n')[0]
  const signature = crypto.createHash('sha256').update(premiereLigne.replace(/[0-9a-f]{8,}|\d+/gi, '#')).digest('hex').slice(0, 32)
  const maintenant = new Date().toISOString()

  const { data: existante, error: tableAbsente } = await supabaseAdmin.from('erreurs').select('*').eq('signature', signature).maybeSingle()
  const vueIci = dernieresAlertes.get(signature)
  const alerter = (!vueIci || Date.now() - vueIci > DELAI_REALERTE_MS)
    && (tableAbsente ? true : !existante?.alerte_at || Date.now() - new Date(existante.alerte_at).getTime() > DELAI_REALERTE_MS)
  await supabaseAdmin.from('erreurs').upsert({
    signature, message, occurrences: (existante?.occurrences || 0) + 1,
    premiere_at: existante?.premiere_at || maintenant, derniere_at: maintenant,
    alerte_at: alerter ? maintenant : existante?.alerte_at || null,
  })
  if (!alerter) return
  dernieresAlertes.set(signature, Date.now())

  const agence = process.env.AGENCE_NOTIF_EMAIL || process.env.SMTP_USER
  if (!agence) return
  const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  await sendMail(agence, `⚠️ Erreur dans l'admin — ${premiereLigne.slice(0, 90)}`,
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1A1310;">
      <p>Une erreur s'est produite dans l'admin La Gabare${existante ? ` (déjà vue ${existante.occurrences} fois depuis le ${new Date(existante.premiere_at).toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })})` : ''}.</p>
      <pre style="white-space:pre-wrap;background:#F5F2EC;padding:12px;border-radius:6px;font-size:12px;">${esc(message)}</pre>
      <p style="color:#7a6f66;">Vous ne recevrez pas de nouvelle alerte pour cette même erreur avant 6 heures. Détail complet : Vercel › projet › Logs.</p>
    </div>`, { fromName: 'La Gabare — Alertes' })
}

export function installerAlertes() {
  if (installe) return
  installe = true
  const origine = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    origine(...args)
    if (enCours || process.env.NODE_ENV !== 'production') return
    const message = texteDe(args)
    if (!message.trim() || IGNORER.some((r) => r.test(message))) return
    enCours = true
    const tache = signaler(message).catch((e) => origine('alerte non envoyée', e)).finally(() => { enCours = false })
    try { waitUntil(tache) } catch { /* hors Vercel : la promesse continue simplement */ }
  }
}
