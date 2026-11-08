import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Enchaînement des tâches du cron « relances » : chaque tâche est isolée (une panne n'arrête pas les suivantes),
// un budget de temps évite de dépasser maxDuration, et un verrou en base empêche deux exécutions en même temps.
export type Tache = { nom: string; run: () => Promise<unknown> }

export async function executerTaches(taches: Tache[], budgetMs: number, debut = Date.now()) {
  const resultats: Record<string, unknown> = {}
  const echecs: string[] = []
  const reportees: string[] = []
  for (const t of taches) {
    if (Date.now() - debut > budgetMs) { reportees.push(t.nom); resultats[t.nom] = { reportee: true }; continue }
    try {
      resultats[t.nom] = await t.run()
    } catch (e) {
      echecs.push(t.nom)
      resultats[t.nom] = { erreur: true }
      console.error('cron relances : tâche en échec', t.nom, e instanceof Error ? e.message : e)
    }
  }
  return { resultats, echecs, reportees }
}

// Verrou (sql/verrous_cron.sql). Tant que le SQL n'est pas lancé, ou si Supabase répond mal : on exécute quand même.
export async function prendreVerrou(nom: string, dureeS: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('prendre_verrou_cron', { p_nom: nom, p_duree_s: dureeS })
    if (!error && typeof data === 'boolean') return data
  } catch {}
  return true
}

export async function libererVerrou(nom: string): Promise<void> {
  try { await supabaseAdmin.rpc('liberer_verrou_cron', { p_nom: nom }) } catch {}
}
