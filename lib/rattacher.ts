// Rattachement automatique d'un lead du formulaire à un prospect du Pipeline, par nom de domaine.
// Prudent : un seul candidat possible, sinon rien n'est lié (on lie alors à la main dans la fiche).
import { supabaseAdmin } from '@/lib/supabase-admin'

const MOTS_VIDES = new Set(['domaine', 'domaines', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'et', 'fils', 'pere', 'earl', 'gaec', 'sarl', 'sas', 'eurl', 'chateau', 'vignoble', 'vignobles', 'cave', 'caves', 'maison', 'maisons', 'ets', 'vins'])

export const noyau = (nom: string) =>
  nom.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .split(/[^a-z0-9]+/).filter((m) => m && !MOTS_VIDES.has(m)).join('')

type Candidat = { id: number; nom: string; stade: string }

export function trouverProspect(domaine: string | null | undefined, prospects: Candidat[]): Candidat | null {
  const n = noyau(domaine || '')
  if (n.length < 4) return null
  const trouves = prospects.filter((p) => {
    const q = noyau(p.nom)
    return q.length >= 4 && (q === n || (Math.min(q.length, n.length) >= 6 && (q.includes(n) || n.includes(q))))
  })
  return trouves.length === 1 ? trouves[0] : null
}

const STADES_AVANT_LEAD = ['prospect', 'pret', 'contacte', 'repondu']

// Ne lève jamais d'erreur : un échec ici ne doit pas gêner l'enregistrement du lead.
export async function rattacherLead(lead: { id: number; domaine?: string | null }): Promise<void> {
  try {
    if (!lead.domaine) return
    const { data } = await supabaseAdmin.from('prospects_hm').select('id, nom, stade')
    const p = trouverProspect(lead.domaine, (data || []) as Candidat[])
    if (!p) return
    await supabaseAdmin.from('leads').update({ prospect_id: p.id }).eq('id', lead.id)
    const passe = STADES_AVANT_LEAD.includes(p.stade)
    if (passe) await supabaseAdmin.from('prospects_hm').update({ stade: 'lead', updated_at: new Date().toISOString() }).eq('id', p.id)
    await supabaseAdmin.from('evenements').insert({
      prospect_id: p.id, type: 'lead',
      titre: `Lead n° ${lead.id} reçu via le formulaire (rattaché automatiquement)`,
      detail: passe ? 'Le stade passe à « Lead ».' : null,
    })
  } catch {
    // volontairement silencieux (pas de console.error : il déclenche une alerte e-mail)
  }
}
