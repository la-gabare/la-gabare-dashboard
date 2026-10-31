// « À décider » : ce qui attend une action de Louis ou de son frère, classé par urgence.
// Fonction pure (testable) + chargement Supabase. Aucune donnée personnelle (ni e-mail ni téléphone).
import { supabaseAdmin } from '@/lib/supabase-admin'

export type Urgence = 'haute' | 'normale'
export type ElementADecider = {
  type: 'lead' | 'devis' | 'echeance' | 'texte' | 'tache' | 'prospect'
  titre: string
  detail: string
  urgence: Urgence
  lien: string
  client_id?: number | null
}

export const SEUIL_RELANCE_DEVIS_JOURS = 5
const JOUR = 86400000

type Lead = { id: number; domaine?: string | null; nom?: string | null; statut?: string | null; created_at: string; mail_envoye_at?: string | null }
type Devis = { id: number; client_id: number; numero: string; envoye_at?: string | null; created_at: string }
type Echeance = { id: number; client_id: number; libelle?: string | null; statut: string; envoye_at?: string | null }
type Texte = { client_id: number; type: 'article' | 'post' }
type Prospect = { slug: string; nom: string; stade: string }
type Tache = { id: number; titre: string; priorite?: string | null; deadline?: string | null; client_id?: number | null }

export type Donnees = {
  leads: Lead[]; devis: Devis[]; echeances: Echeance[]; textes: Texte[]; taches: Tache[]; prospects?: Prospect[]
  noms_clients: Record<number, string>
}

const jours = (depuis: string | null | undefined, maintenant: number) =>
  depuis ? Math.floor((maintenant - new Date(depuis).getTime()) / JOUR) : 0

export function construireADecider(d: Donnees, maintenant = Date.now()): ElementADecider[] {
  const nom = (id?: number | null) => (id != null && d.noms_clients[id]) || 'Client'
  const liste: ElementADecider[] = []

  for (const l of d.leads) {
    const statut = l.statut || 'reception'
    const age = jours(statut === 'mail_envoye' ? l.mail_envoye_at || l.created_at : l.created_at, maintenant)
    const nouveau = statut === 'reception'
    if (!nouveau && !(statut === 'mail_envoye' && age >= 3) && statut !== 'relance') continue
    liste.push({
      type: 'lead', titre: l.domaine || l.nom || `Lead n° ${l.id}`,
      detail: nouveau ? 'Nouveau lead à contacter' : `Sans réponse depuis ${age} jour(s)`,
      urgence: nouveau || age >= 7 ? 'haute' : 'normale', lien: '/leads',
    })
  }

  for (const v of d.devis) {
    const age = jours(v.envoye_at || v.created_at, maintenant)
    if (age < SEUIL_RELANCE_DEVIS_JOURS) continue
    liste.push({
      type: 'devis', titre: `${nom(v.client_id)} — devis ${v.numero}`, detail: `Envoyé il y a ${age} jours, pas de réponse`,
      urgence: age >= 10 ? 'haute' : 'normale', lien: `/clients/${v.client_id}`, client_id: v.client_id,
    })
  }

  for (const e of d.echeances) {
    if (e.statut !== 'envoye' && e.statut !== 'virement_en_attente') continue
    const age = jours(e.envoye_at, maintenant)
    if (e.statut === 'envoye' && age < 7) continue
    liste.push({
      type: 'echeance', titre: `${nom(e.client_id)} — ${e.libelle || 'échéance'}`,
      detail: e.statut === 'virement_en_attente' ? 'Virement à confirmer' : `Non réglée depuis ${age} jours`,
      urgence: e.statut === 'virement_en_attente' || age >= 14 ? 'haute' : 'normale', lien: `/clients/${e.client_id}`, client_id: e.client_id,
    })
  }

  for (const p of d.prospects || []) {
    if (p.stade !== 'pret' && p.stade !== 'repondu') continue
    liste.push({
      type: 'prospect', titre: p.nom,
      detail: p.stade === 'repondu' ? 'A répondu : à traiter' : 'Dossier prêt : à valider avant envoi',
      urgence: p.stade === 'repondu' ? 'haute' : 'normale', lien: '/pipeline',
    })
  }

  const parClient = new Map<number, number>()
  for (const t of d.textes) parClient.set(t.client_id, (parClient.get(t.client_id) || 0) + 1)
  for (const [clientId, n] of parClient) {
    liste.push({ type: 'texte', titre: nom(clientId), detail: `${n} texte(s) en brouillon à relire`, urgence: 'normale', lien: '/contenu', client_id: clientId })
  }

  for (const t of d.taches) {
    const enRetard = !!t.deadline && new Date(t.deadline).getTime() < maintenant
    if (t.priorite !== 'haute' && !enRetard) continue
    liste.push({ type: 'tache', titre: t.titre, detail: enRetard ? 'Échéance dépassée' : 'Priorité haute', urgence: 'haute', lien: '/taches', client_id: t.client_id ?? null })
  }

  const rang = { haute: 0, normale: 1 }
  return liste.sort((a, b) => rang[a.urgence] - rang[b.urgence])
}

export async function chargerADecider(): Promise<ElementADecider[]> {
  const [leads, devis, echeances, articles, posts, taches, clients, prospects] = await Promise.all([
    supabaseAdmin.from('leads').select('id, domaine, nom, statut, created_at, mail_envoye_at').limit(200),
    supabaseAdmin.from('devis').select('id, client_id, numero, envoye_at, created_at').eq('statut', 'envoye'),
    supabaseAdmin.from('echeances').select('id, client_id, libelle, statut, envoye_at').in('statut', ['envoye', 'virement_en_attente']),
    supabaseAdmin.from('articles').select('client_id').eq('status', 'brouillon'),
    supabaseAdmin.from('posts').select('client_id').eq('status', 'brouillon'),
    supabaseAdmin.from('taches').select('id, titre, priorite, deadline, client_id').neq('statut', 'terminee'),
    supabaseAdmin.from('clients').select('id, nom_domaine'),
    supabaseAdmin.from('prospects_hm').select('slug, nom, stade').in('stade', ['pret', 'repondu']),
  ])
  const noms: Record<number, string> = {}
  for (const c of (clients.data || []) as { id: number; nom_domaine: string }[]) noms[c.id] = c.nom_domaine
  const textes: Texte[] = [
    ...((articles.data || []) as { client_id: number }[]).map((a) => ({ client_id: a.client_id, type: 'article' as const })),
    ...((posts.data || []) as { client_id: number }[]).map((p) => ({ client_id: p.client_id, type: 'post' as const })),
  ]
  return construireADecider({
    leads: (leads.data || []) as Lead[], devis: (devis.data || []) as Devis[], echeances: (echeances.data || []) as Echeance[],
    textes, taches: (taches.data || []) as Tache[], noms_clients: noms,
    prospects: (prospects.data || []) as Prospect[],
  })
}
