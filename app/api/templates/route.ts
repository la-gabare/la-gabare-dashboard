import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'templates'

// Seules les pages de contenu sont exposees. Les fichiers PHP restent prives :
// ils contiennent la logique d'authentification du tableau de bord.
const PAGES_AUTORISEES = ['domaine.html', 'cuvees.html', 'contact.html', 'boutique.html']

export async function GET(req: NextRequest) {
  const pack = req.nextUrl.searchParams.get('pack') === 'pro' ? 'pro' : 'essentiel'
  const demandees = (req.nextUrl.searchParams.get('pages') || 'domaine.html,cuvees.html')
    .split(',')
    .map((p) => p.trim())
    .filter((p) => PAGES_AUTORISEES.includes(p))

  if (!demandees.length) {
    return NextResponse.json({ error: 'Aucune page valide demandee' }, { status: 400 })
  }

  const pages: Record<string, string> = {}
  for (const nom of demandees) {
    const { data } = await supabaseAdmin.storage.from(BUCKET).download(`${pack}/${nom}`)
    if (data) pages[nom] = await data.text()
  }

  return NextResponse.json({ pack, pages })
}
