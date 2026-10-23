import { supabaseAdmin } from '@/lib/supabase-admin'
import { publishPostToMeta } from '@/lib/meta-publish'

// Publie les posts « programme » dont la date prévue est arrivée (remplace le workflow n8n « 02-Social Media »).
export async function publierPostsProgrammes() {
  const aujourdhui = new Date().toISOString().slice(0, 10)
  const { data: posts } = await supabaseAdmin.from('posts').select('*').eq('status', 'programme').lte('date_publication_prevue', aujourdhui)
  let publies = 0
  const ignores: string[] = []
  for (const post of posts || []) {
    if (!post.media_url) { ignores.push(`${post.id}: aucun média`); continue }
    const { data: compte } = await supabaseAdmin.from('client_social_accounts')
      .select('instagram_business_account_id, facebook_page_id, access_token').eq('client_id', post.client_id).single()
    if (!compte) { ignores.push(`${post.id}: aucun compte connecté`); continue }
    try {
      await publishPostToMeta(compte, post)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      if (message === 'PROCESSING') { ignores.push(`${post.id}: média en traitement, nouvel essai demain`); continue }
      console.error('Publication programmée échouée', post.id, err)
      continue
    }
    await supabaseAdmin.from('posts').update({ status: 'publie', date_publication_reelle: new Date().toISOString() }).eq('id', post.id)
    publies++
  }
  return { dus: posts?.length || 0, publies, ignores }
}
