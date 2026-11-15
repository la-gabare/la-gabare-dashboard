// Campagne de prospection (mail « Présentation ») : règles pures, sans base ni envoi. Voir app/api/campagne/route.ts.
import { EMAIL_RE } from '@/lib/mail-maquette'

export const LIMITE_JOUR = 30
export const STATUTS = ['a_contacter', 'envoye', 'refus', 'erreur'] as const
export type Statut = (typeof STATUTS)[number]

// Minuit à Paris (début de la journée comptée pour le plafond d'envois), en instant UTC.
export function debutJourneeParis(now = new Date()): Date {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(now).map((x) => [x.type, Number(x.value)]))
  const decalage = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(now.getTime() / 1000) * 1000
  return new Date(Date.UTC(p.year, p.month - 1, p.day) - decalage)
}

export const restantAujourdhui = (dejaEnvoyes: number) => Math.max(0, LIMITE_JOUR - dejaEnvoyes)

// Le message ne part pas tant qu'il reste une phrase entre crochets à personnaliser.
export const messageAPersonnaliser = (m: string) => /\[[^\]]+\]/.test(m)

export interface Destinataire { nom: string; appellation: string; commune: string; site: string; email: string; telephone: string; source: string; indices: string }

// CSV des listes de prospects (séparateur « ; », guillemets possibles) -> destinataires avec une adresse valide.
export function lireCsv(texte: string): Destinataire[] {
  const lignes: string[][] = []
  let champ = '', ligne: string[] = [], guillemets = false
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i]
    if (guillemets) {
      if (c === '"' && texte[i + 1] === '"') { champ += '"'; i++ } else if (c === '"') guillemets = false; else champ += c
    } else if (c === '"') guillemets = true
    else if (c === ';') { ligne.push(champ); champ = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && texte[i + 1] === '\n') i++; ligne.push(champ); champ = ''; lignes.push(ligne); ligne = [] }
    else champ += c
  }
  if (champ || ligne.length) { ligne.push(champ); lignes.push(ligne) }
  return lignes.slice(1).filter((l) => l.length >= 5).map((l) => ({
    nom: l[0].trim(), appellation: (l[1] || '').trim(), commune: (l[2] || '').trim(), site: (l[3] || '').trim(),
    email: (l[4] || '').trim().toLowerCase(), telephone: (l[5] || '').trim(), source: (l[6] || '').trim(), indices: (l[7] || '').trim(),
  })).filter((d) => d.nom && EMAIL_RE.test(d.email))
}

const q = (s: string) => (s ? `'${s.replace(/'/g, "''")}'` : 'null')

// INSERT idempotent (un e-mail déjà présent est ignoré) à coller dans Supabase.
export function sqlImport(lignes: Destinataire[], campagne = 'presentation'): string {
  const valeurs = lignes.map((d) => `(${q(campagne)}, ${q(d.nom)}, ${q(d.appellation)}, ${q(d.commune)}, ${q(d.site)}, ${q(d.email)}, ${q(d.telephone)}, ${q(d.source)}, ${q(d.indices)})`)
  return `insert into campagne_destinataires (campagne, nom, appellation, commune, site, email, telephone, source, indices) values\n${valeurs.join(',\n')}\non conflict (campagne, lower(email)) do nothing;\n`
}
