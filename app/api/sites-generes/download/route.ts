import { NextRequest, NextResponse } from 'next/server'
import JSZip from 'jszip'
import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'templates'

const slug = (s: string) =>
  (s || 'site')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'site'

type Admin = { file: string; password: string; password_hash: string }
type SiteComplet = { admin?: Admin; pages?: Record<string, string> }

// Le generateur produit un HTML autonome : on en ressort les styles et scripts
// pour retrouver une arborescence hebergeable, et surtout pour que le CSS
// personnalise s'applique aussi aux pages issues du modele.
function decouper(html: string) {
  const styles: string[] = []
  let out = html.replace(/<style>([\s\S]*?)<\/style>/gi, (_m, css) => {
    styles.push(css)
    return styles.length === 1 ? '<link rel="stylesheet" href="css/style.css">' : ''
  })

  const scripts: string[] = []
  out = out.replace(/<script(?![^>]*\btype=)[^>]*>([\s\S]*?)<\/script>/gi, (m, js) => {
    if (/\bsrc=/i.test(m)) return m
    scripts.push(js)
    return scripts.length === 1 ? '<script src="js/main.js"></script>' : ''
  })

  return { html: out, css: styles.join('\n\n'), js: scripts.join('\n\n') }
}

async function listerSocle(pack: string) {
  const fichiers: { chemin: string }[] = []
  for (const dossier of ['', 'css', 'js']) {
    const prefixe = dossier ? `${pack}/${dossier}` : pack
    const { data } = await supabaseAdmin.storage.from(BUCKET).list(prefixe, { limit: 200 })
    for (const f of data || []) {
      if (!f.name || f.id === null) continue
      fichiers.push({ chemin: dossier ? `${dossier}/${f.name}` : f.name })
    }
  }
  return fichiers
}

async function telecharger(pack: string, chemin: string) {
  const { data } = await supabaseAdmin.storage.from(BUCKET).download(`${pack}/${chemin}`)
  if (!data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: site, error } = await supabaseAdmin
    .from('sites_generes')
    .select('id, client_id, pack, status, html_genere, site_complet')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  if (!site?.html_genere) return NextResponse.json({ error: 'Ce site n a pas encore de HTML genere' }, { status: 404 })

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('nom_domaine')
    .eq('id', site.client_id)
    .single()

  const complet = (site.site_complet || {}) as SiteComplet
  const estComplet = site.status === 'pret' && !!complet.admin
  const pack = site.pack === 'pro' ? 'pro' : 'essentiel'

  const zip = new JSZip()
  const decoupe = decouper(site.html_genere)
  let html = decoupe.html

  if (estComplet) {
    // Socle du pack : pages, PHP, scripts. Le CSS vient de l'apercu personnalise.
    const socle = await listerSocle(pack)
    for (const f of socle) {
      if (f.chemin === 'index.html') continue
      if (f.chemin === 'css/style.css') continue
      if (f.chemin === 'config-admin.php') continue

      // Page reecrite par l'IA : on prefere sa version
      const genereee = complet.pages?.[f.chemin]
      if (genereee) {
        zip.file(f.chemin, genereee)
        continue
      }

      const buf = await telecharger(pack, f.chemin)
      if (!buf) continue

      // Le dashboard prend son nom unique par client
      const cible = f.chemin === 'dashboard.php' ? complet.admin!.file : f.chemin
      zip.file(cible, buf)
    }

    zip.file(
      'config-admin.php',
      [
        '<?php',
        "// Hash SHA-256 du mot de passe (jamais le mot de passe en clair).",
        "// Pour le changer : echo hash('sha256', 'nouveau-mot-de-passe');",
        `define('ADMIN_PASSWORD_HASH', '${complet.admin!.password_hash}');`,
        '',
        "// Nom du fichier de l'espace client (redirection apres connexion).",
        `define('ADMIN_PANEL_FILE', '${complet.admin!.file}');`,
        '',
      ].join('\n')
    )
  }

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
  if (decoupe.css) zip.file('css/style.css', decoupe.css)
  if (decoupe.js) zip.file('js/main.js', decoupe.js)

  const lignes = [
    `Site genere pour ${client?.nom_domaine || 'le domaine'} (generation #${site.id}).`,
    '',
    estComplet ? `Pack ${pack} : site complet.` : 'Apercu : page d accueil seule.',
    '',
    'Contenu de l archive :',
    '  index.html      la page d accueil',
    '  css/style.css   les styles',
    '  js/main.js      le portail d age, le menu et les interactions',
    `  images/         ${rapatriees} fichier(s) rapatrie(s)`,
  ]
  if (estComplet) {
    lignes.push(
      '  les autres pages du site',
      `  ${complet.admin!.file}  le tableau de bord du client`,
      '  login.php, logout.php, change-password.php, config-admin.php, publish.php',
      '',
      '--- Acces au tableau de bord ---',
      `Adresse    : votre-domaine.fr/login.php`,
      `Mot de passe : ${complet.admin!.password}`,
      '',
      'Ce mot de passe est propre a ce site. Communiquez-le au client et',
      'invitez-le a le changer depuis change-password.php.',
      '',
      'Hebergement : le site necessite PHP. Deposez tous les fichiers a la',
      'racine en conservant les dossiers css, js et images.'
    )
  } else {
    lignes.push(
      '',
      'Pour obtenir le site complet (toutes les pages et le tableau de bord),',
      'validez cet apercu depuis le createur de site.'
    )
  }
  zip.file('LISEZMOI.txt', lignes.join('\n'))

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  const suffixe = estComplet ? 'complet' : 'apercu'
  const filename = `${slug(client?.nom_domaine || '')}-${suffixe}-${site.id}.zip`

  return new NextResponse(new Uint8Array(content), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(content.length),
    },
  })
}
