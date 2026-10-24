// Résumé texte d'un plan éditorial (pour Telegram / le feed Harness). Pur : aucun accès base ni réseau.

export type ArticlePlan = { id: number; titre: string; angle?: string | null; date_publication_prevue: string }
export type PostPlan = { article_id?: number | null; reseau?: string | null; format?: string | null; contenu?: string | null; date_publication_prevue: string }

const jourMois = (d: string) => new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', day: '2-digit', month: '2-digit' })
const maj = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const coupe = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

export function resumePlan(articles: ArticlePlan[], posts: PostPlan[]): string {
  const parDate = <T extends { date_publication_prevue: string }>(l: T[]) => [...l].sort((a, b) => a.date_publication_prevue.localeCompare(b.date_publication_prevue))
  const a = parDate(articles).map((x) => `• ${jourMois(x.date_publication_prevue)} · ${x.angle ? `${x.angle} · ` : ''}${x.titre}`)
  const p = parDate(posts).map((x) => {
    const relaye = articles.find((y) => y.id === x.article_id)
    return `• ${jourMois(x.date_publication_prevue)} · ${maj(x.reseau)} ${x.format || ''}${relaye ? ` (relaie « ${coupe(relaye.titre, 40)} »)` : ''}`.replace(/\s+\(/, ' (').trim()
  })
  return [`ARTICLES (${a.length})`, ...a, '', `PUBLICATIONS (${p.length})`, ...p].join('\n')
}
