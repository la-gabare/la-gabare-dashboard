import 'server-only'
import { esc, euros, publishToken, siteBase, Produit } from '@/lib/boutique/core'

interface ClientSite {
  nom_domaine: string
  domaine?: string | null
  site_url?: string | null
  publish_token?: string | null
}

// Le site du domaine fournit son gabarit : boutique-modele.html (header/footer du site)
// avec les marqueurs {{TITRE}} {{DESCRIPTION}} {{CANONICAL}} {{ROBOTS}} {{JSONLD}} {{CONTENU}}.
// On génère boutique.html et une page cuvee-<slug>.html par cuvée, envoyées à boutique-publish.php.

function remplir(modele: string, champs: Record<string, string>) {
  return modele.replace(/\{\{(TITRE|DESCRIPTION|CANONICAL|ROBOTS|JSONLD|CONTENU)\}\}/g, (_, k) => champs[k] ?? '')
}

function resume(p: Produit, max = 155) {
  const t = (p.description || `${p.nom}${p.appellation ? ', ' + p.appellation : ''}`).replace(/\s+/g, ' ').trim()
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t
}

function titreCuvee(p: Produit) {
  return [p.nom, p.millesime].filter(Boolean).join(' ')
}

function boutonAjout(p: Produit) {
  return `<div class="gb-buy" data-gabare-produit="${p.id}">
      <span class="gb-price" data-gabare-prix>${esc(euros(p.prix_cents))}</span>
      <span class="gb-stock" data-gabare-stock></span>
      <div class="gb-qty"><button type="button" class="gb-qty__btn" data-gabare-moins aria-label="Retirer une unité">−</button><input class="gb-qty__input" type="number" min="1" value="1" inputmode="numeric" aria-label="Quantité" data-gabare-quantite><button type="button" class="gb-qty__btn" data-gabare-plus aria-label="Ajouter une unité">+</button></div>
      <button type="button" class="gb-add" data-gabare-ajouter>Ajouter au panier</button>
    </div>`
}

function carte(p: Produit) {
  const img = p.image_url
    ? `<img class="gb-card__img" src="${esc(p.image_url)}" alt="${esc(titreCuvee(p))}" loading="lazy" width="600" height="800">`
    : ''
  return `<article class="gb-card">
    <a class="gb-card__link" href="cuvee-${esc(p.slug)}.html">${img}
      <h2 class="gb-card__title">${esc(titreCuvee(p))}</h2>
      <p class="gb-card__meta">${esc([p.appellation, p.couleur, p.contenance].filter(Boolean).join(' · '))}</p>
    </a>
    ${boutonAjout(p)}
  </article>`
}

function jsonLdProduit(p: Produit, base: string, domaine: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: titreCuvee(p),
    description: resume(p, 500),
    image: p.image_url || undefined,
    brand: { '@type': 'Brand', name: domaine },
    category: 'Vin',
    url: `${base}/cuvee-${p.slug}.html`,
    offers: {
      '@type': 'Offer',
      price: (p.prix_cents / 100).toFixed(2),
      priceCurrency: 'EUR',
      availability: p.stock > 0 && p.actif ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `${base}/cuvee-${p.slug}.html`,
    },
  }
}

function script(json: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(json).replace(/</g, '\\u003c')}</script>`
}

export function pageBoutique(modele: string, client: ClientSite, produits: Produit[]) {
  const base = siteBase(client)
  const actifs = produits.filter(p => p.actif)
  const contenu = `<section class="gb-shop">
  <header class="gb-shop__head">
    <h1 class="gb-shop__title">Boutique</h1>
    <p class="gb-shop__lead">Nos cuvées, expédiées depuis le domaine.</p>
  </header>
  <div class="gb-grid">
    ${actifs.map(carte).join('\n    ')}
  </div>
  <p class="gb-legal">La vente d'alcool est interdite aux mineurs. L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>
</section>`
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: actifs.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: `${base}/cuvee-${p.slug}.html` })),
  }
  return remplir(modele, {
    TITRE: esc(`Boutique — ${client.nom_domaine}`),
    DESCRIPTION: esc(`Commandez les vins du ${client.nom_domaine} en direct du domaine : ${actifs.slice(0, 4).map(titreCuvee).join(', ')}.`.slice(0, 160)),
    CANONICAL: `${base}/boutique.html`,
    ROBOTS: 'index, follow',
    JSONLD: script(itemList),
    CONTENU: contenu,
  })
}

export function pageCuvee(modele: string, client: ClientSite, p: Produit) {
  const base = siteBase(client)
  const specs = [
    ['Appellation', p.appellation], ['Couleur', p.couleur], ['Millésime', p.millesime], ['Contenance', p.contenance],
  ].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')
  const paragraphes = (p.description || '').split(/\n{2,}/).filter(Boolean).map(t => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('')
  const contenu = `<section class="gb-product">
  <nav class="gb-crumbs"><a href="boutique.html">Boutique</a> › ${esc(titreCuvee(p))}</nav>
  <div class="gb-product__grid">
    ${p.image_url ? `<img class="gb-product__img" src="${esc(p.image_url)}" alt="${esc(titreCuvee(p))}" width="600" height="800">` : '<div></div>'}
    <div class="gb-product__info">
      <h1 class="gb-product__title">${esc(titreCuvee(p))}</h1>
      ${specs ? `<dl class="gb-specs">${specs}</dl>` : ''}
      ${p.actif ? boutonAjout(p) : '<p class="gb-stock gb-stock--out">Cette cuvée n\'est plus disponible à la vente.</p>'}
      <div class="gb-product__desc">${paragraphes}</div>
      ${p.accords ? `<h2 class="gb-product__h2">Accords</h2><p>${esc(p.accords)}</p>` : ''}
    </div>
  </div>
  <p class="gb-legal">L'abus d'alcool est dangereux pour la santé, à consommer avec modération.</p>
</section>`
  return remplir(modele, {
    TITRE: esc(`${titreCuvee(p)} — ${client.nom_domaine}`),
    DESCRIPTION: esc(resume(p)),
    CANONICAL: `${base}/cuvee-${p.slug}.html`,
    ROBOTS: p.actif ? 'index, follow' : 'noindex, follow',
    JSONLD: script(jsonLdProduit(p, base, client.nom_domaine)),
    CONTENU: contenu,
  })
}

async function envoyer(base: string, token: string, filename: string, html: string) {
  const res = await fetch(`${base}/boutique-publish.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filename, html }),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`${filename} : ${res.status} ${txt.slice(0, 120)}`)
  }
}

export async function publierBoutique(client: ClientSite, produits: Produit[]) {
  const base = siteBase(client)
  const resModele = await fetch(`${base}/boutique-modele.html`, { cache: 'no-store' })
  if (!resModele.ok) throw new Error(`Gabarit introuvable : ${base}/boutique-modele.html (${resModele.status})`)
  const modele = await resModele.text()
  if (!modele.includes('{{CONTENU}}')) throw new Error('Le gabarit boutique-modele.html ne contient pas {{CONTENU}}')

  const token = publishToken(client)
  const pages: [string, string][] = [['boutique.html', pageBoutique(modele, client, produits)]]
  for (const p of produits) pages.push([`cuvee-${p.slug}.html`, pageCuvee(modele, client, p)])

  const erreurs: string[] = []
  for (const [filename, html] of pages) {
    try { await envoyer(base, token, filename, html) } catch (e) { erreurs.push(e instanceof Error ? e.message : String(e)) }
  }
  return { publiees: pages.length - erreurs.length, erreurs, url: `${base}/boutique.html` }
}
