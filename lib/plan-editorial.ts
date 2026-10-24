import 'server-only'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Demande un plan éditorial pour un client abonné : crée une ligne plans_generation « en_attente »,
// qui sert de liste « à faire » aux agents du pôle Contenu (n8n n'intervient plus).
// Pas de doublon : rien si une demande est déjà en attente ou si un plan a été créé il y a moins de `joursMin` jours.
export async function lancerPlanEditorial(clientId: number | string, origine: string, joursMin = 25) {
  const { data: client } = await supabaseAdmin.from('clients').select('id, statut, abonnement').eq('id', clientId).single()
  if (!client || client.statut !== 'actif' || !client.abonnement) return null
  // Activation depuis l'admin : l'abonnement démarre aujourd'hui (sert au rythme mensuel des plans)
  if (origine === 'admin') {
    await supabaseAdmin.from('clients').update({ date_debut_abonnement: new Date().toISOString().slice(0, 10) })
      .eq('id', client.id).is('date_debut_abonnement', null)
  }

  const depuis = new Date(Date.now() - joursMin * 24 * 60 * 60 * 1000).toISOString()
  const { data: recents } = await supabaseAdmin.from('plans_generation').select('id, status, created_at')
    .eq('client_id', client.id).or(`status.eq.en_attente,created_at.gte.${depuis}`).limit(1)
  if (recents?.length) return null

  const { data, error } = await supabaseAdmin.from('plans_generation')
    .insert({ client_id: client.id, status: 'en_attente', date_debut: new Date().toISOString().slice(0, 10) })
    .select().single()
  if (error) {
    console.error('plan éditorial', origine, error.message)
    return null
  }
  return data
}

// Le statut ou la formule d'abonnement vient de changer : faut-il lancer un plan ?
export function abonnementActive(avant: { statut?: string | null; abonnement?: string | null }, apres: { statut?: string | null; abonnement?: string | null }) {
  if (apres.statut !== 'actif' || !apres.abonnement) return false
  return avant.statut !== 'actif' || avant.abonnement !== apres.abonnement
}
