import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getClientFromRequest } from '@/lib/auth-client'
import { withCors, corsPreflight } from '@/lib/cors'
import { notifier, nomClient, eurosCourt } from '@/lib/notifier'

export async function OPTIONS() {
  return corsPreflight()
}

function json(data: unknown, status = 200) {
  return withCors(NextResponse.json(data, { status }))
}

function egal(a: string, b: string) {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}

function slugify(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 80)
}

// Deux usages :
// 1. Espace client (session Supabase du client) : { article_id } -> publie un article préparé par l'agence.
// 2. Admin PHP du site client (clé API du domaine) : { domain, token, titre, contenu, ... } -> publie un article écrit par le domaine.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))

    if (body.article_id) {
      const auth = await getClientFromRequest(req)
      if ('error' in auth) return json({ error: auth.error }, auth.status)

      const id = Number(body.article_id)
      const { data: article } = await supabaseAdmin
        .from('articles')
        .select('id, angle, client_id, image_url, contenu')
        .eq('id', id)
        .single()

      // Un client ne peut publier que ses propres articles
      if (!article || article.client_id !== auth.client.id) return json({ error: 'Article not found' }, 404)

      // Un article sans texte ne doit jamais être publié (page vide sur le site du vigneron)
      if (!article.contenu || !String(article.contenu).trim()) {
        return json({ error: "Cet article n'a pas encore de texte : il ne peut pas être publié." }, 400)
      }

      const fields: { status: string; image_url?: string } = { status: 'publie' }

      // Sans image, on prend une photo de la galerie du client correspondant à l'angle de l'article
      if (!article.image_url && article.angle) {
        const { data: photos } = await supabaseAdmin
          .from('photos_galerie')
          .select('image_url')
          .eq('client_id', article.client_id)
          .eq('angle', article.angle)
        if (photos && photos.length > 0) {
          fields.image_url = photos[Math.floor(Math.random() * photos.length)].image_url
        }
      }

      const { data: updated, error } = await supabaseAdmin.from('articles').update(fields).eq('id', id).select()
      if (error) return json({ error: error.message }, 400)
      return json({ success: true, article: updated?.[0] })
    }

    const { domain, token, titre, contenu } = body
    if (!domain || !token || !titre || !contenu) {
      return json({ error: 'article_id, ou domain + token + titre + contenu, sont requis' }, 400)
    }
    const { data: client } = await supabaseAdmin
      .from('clients')
      .select('id, api_key')
      .eq('domaine', String(domain).toLowerCase().replace(/^www\./, ''))
      .single()
    if (!client?.api_key || !egal(String(client.api_key), String(token))) {
      return json({ error: 'Clé API La Gabare incorrecte (Paramètres du site).' }, 401)
    }

    const { data: cree, error } = await supabaseAdmin.from('articles_publications').insert({
      client_id: client.id,
      titre: String(titre).slice(0, 300),
      contenu: String(contenu).slice(0, 100000),
      slug: slugify(String(body.slug || titre)),
      image_url: body.image_url ? String(body.image_url).slice(0, 1000) : null,
      date_publication: body.date_publication || new Date().toISOString(),
      statut: 'publie',
    }).select().single()
    if (error) {
      console.error('publish-article (site)', error)
      return json({ error: error.message }, 400)
    }
    await notifier({ titre: `Article publié — ${cree.titre || ''}`, niveau: 'success', url: 'https://admin.la-gabare.fr/contenu' })
    return json({ success: true, article: cree })
  } catch (err) {
    console.error('Publish article exception:', err)
    return json({ error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}` }, 500)
  }
}
