import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase-admin'

const slug = (s: string) =>
  (s || 'site')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'site'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: site, error } = await supabaseAdmin
    .from('sites_generes')
    .select('id, client_id, html_genere')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!site?.html_genere) return NextResponse.json({ error: 'Ce site n a pas encore de HTML genere' }, { status: 404 })

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('nom_domaine')
    .eq('id', site.client_id)
    .single()

  let html: string = site.html_genere

  // Le generateur produit un fichier autonome : on redecoupe en arborescence hebergeable.
  const styles: string[] = []
  html = html.replace(/<style>([\s\S]*?)<\/style>/gi, (_m, css) => {
    styles.push(css)
    return styles.length === 1 ? '<link rel="stylesheet" href="css/style.css">' : ''
  })

  const scripts: string[] = []
  html = html.replace(/<script(?![^>]*\btype=)[^>]*>([\s\S]*?)<\/script>/gi, (m, js) => {
    if (/\bsrc=/i.test(m)) return m
    scripts.push(js)
    return scripts.length === 1 ? '<script src="js/main.js"></script>' : ''
  })

  const zip = new JSZip()

  // Images distantes rapatriees pour que l'archive fonctionne hors ligne.
  const urls = [...new Set((html.match(/https?:\/\/[^"'\s)]+\.(?:png|jpe?g|webp|gif|svg|avif)/gi) || []))]
  const images = zip.folder('images')
  let rapatriees = 0
  await Promise.all(
    urls.slice(0, 40).map(async (url, i) => {
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const buf = Buffer.from(await res.arrayBuffer())
        const ext = (url.split('.').pop() || 'jpg').split(/[?#]/)[0].toLowerCase()
        const name = `img-${i + 1}.${ext}`
        images?.file(name, buf)
        html = html.split(url).join(`images/${name}`)
        rapatriees++
      } catch {
        // image inaccessible : on garde l'URL d'origine
      }
    })
  )

  zip.file('index.html', html)
  if (styles.length) zip.file('css/style.css', styles.join('\n\n'))
  if (scripts.length) zip.file('js/main.js', scripts.join('\n\n'))
  zip.file(
    'LISEZMOI.txt',
    [
      `Site genere pour ${client?.nom_domaine || 'le domaine'} (generation #${site.id}).`,
      '',
      'Contenu de l archive :',
      '  index.html      la page',
      '  css/style.css   les styles',
      '  js/main.js      le portail d age, le menu et les interactions',
      `  images/         ${rapatriees} fichier(s) rapatrie(s)`,
      '',
      'Pour mettre en ligne, deposez ces fichiers a la racine de votre hebergement',
      'en conservant les dossiers css, js et images.',
    ].join('\n')
  )

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const filename = `${slug(client?.nom_domaine || '')}-site-${site.id}.zip`

  return new NextResponse(new Uint8Array(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(content.length),
    },
  })
}
