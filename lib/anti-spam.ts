import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

// ── Champ piège + délai minimal de remplissage (sans service tiers : pas de captcha, RGPD) ──
// Le formulaire du site contient un champ caché « site_web » (doit rester vide) et un champ caché « ouvert_a »
// (heure d'ouverture de la page, en millisecondes). Un robot remplit le piège ou envoie tout de suite.
// Pendant la transition, un formulaire sans « ouvert_a » reste accepté.
export const DELAI_MIN_MS = 3000
const DELAI_MAX_MS = 24 * 60 * 60 * 1000

export function ressembleAUnRobot(body: Record<string, unknown>, maintenant = Date.now()): boolean {
  if (body.site_web) return true
  if (body.ouvert_a === undefined || body.ouvert_a === null || body.ouvert_a === '') return false
  const t = Number(body.ouvert_a)
  if (!Number.isFinite(t)) return true
  const ecoule = maintenant - t
  return ecoule < DELAI_MIN_MS || ecoule > DELAI_MAX_MS
}

// ── Jeton du lien du brief : HMAC du numéro du lead, pour que lead_id ne soit pas devinable ──
// Secret : BRIEF_TOKEN_SECRET (à créer dans Vercel). Sans secret, aucun jeton n'est émis et le lien reste l'ancien.
const LONGUEUR = 24

function secret(): string {
  return process.env.BRIEF_TOKEN_SECRET || ''
}

export function jetonBrief(leadId: string | number): string | null {
  const s = secret()
  if (!s) return null
  return createHmac('sha256', s).update(`brief:${leadId}`).digest('base64url').slice(0, LONGUEUR)
}

export function jetonBriefValide(leadId: string | number, jeton: unknown): boolean {
  const attendu = jetonBrief(leadId)
  if (!attendu || typeof jeton !== 'string' || jeton.length !== attendu.length) return false
  return timingSafeEqual(Buffer.from(jeton), Buffer.from(attendu))
}

// Lien du formulaire détaillé envoyé au prospect (avec jeton si le secret existe)
export function lienBrief(leadId?: string | number | null): string {
  const base = 'https://la-gabare.fr/formulaire-complet.html'
  if (leadId === undefined || leadId === null || leadId === '') return base
  const k = jetonBrief(leadId)
  return `${base}?lead_id=${encodeURIComponent(String(leadId))}${k ? `&k=${k}` : ''}`
}
