import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabase-admin'

const slug = (s: string) =>
  (s || 'domaine')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'domaine'

// Mot de passe lisible a dicter au client, sans caracteres ambigus.
function motDePasse() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(14)
  return Array.from(bytes, (b) => alphabet[b % alphabet.length])
    .join('')
    .replace(/(.{5})(.{5})(.{4})/, '$1-$2-$3')
}

export async function POST(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: site, error } = await supabaseAdmin
    .from('sites_generes')
    .select('id, client_id, pack, status, html_genere, site_complet')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!site.html_genere) return NextResponse.json({ error: 'Aucun apercu a valider' }, { status: 400 })

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('nom_domaine')
    .eq('id', site.client_id)
    .single()

  // Les identifiants ne sont generes qu'une fois : une revalidation ne doit pas
  // invalider un mot de passe deja transmis au client.
  const existant = (site.site_complet || {}) as { admin?: { file: string; password: string } }
  const admin =
    existant.admin ||
    (() => {
      const password = motDePasse()
      return {
        file: `espace-${slug(client?.nom_domaine || '')}-${crypto.randomBytes(4).toString('hex')}.php`,
        password,
        password_hash: crypto.createHash('sha256').update(password).digest('hex'),
      }
    })()

  const { error: upErr } = await supabaseAdmin
    .from('sites_generes')
    .update({
      status: 'validee',
      site_complet: { ...existant, admin, valide_le: new Date().toISOString() },
    })
    .eq('id', id)

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 })

  return NextResponse.json({
    ok: true,
    pack: site.pack,
    admin_file: admin.file,
    admin_password: admin.password,
  })
}
