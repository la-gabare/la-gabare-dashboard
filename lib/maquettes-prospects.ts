// Aperçus (captures JPEG) des maquettes de prospects, déposés par Harness Maxxing.
// Stockés dans un bucket PRIVÉ ; l'admin les affiche via /api/prospects/maquette/<slug>/<vue> (protégé par le mot de passe).
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const BUCKET = 'maquettes-prospects'
export const VUES = ['bureau', 'mobile'] as const
export type Vue = (typeof VUES)[number]
export const TAILLE_MAX = 1_500_000
export const urlApercu = (slug: string) => `/api/prospects/maquette/${slug}/bureau`
// La page .html complète (pièce jointe du mail) : « ?html=1 » dans maquette_url dit qu'elle est déposée.
export const MARQUE_HTML = '?html=1'

export const estJpeg = (b: Buffer) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff

async function assurerBucket() {
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, { public: false })
  if (error && !/already exists|duplicate/i.test(error.message)) throw new Error('bucket')
}

export async function deposerApercus(slug: string, images: Partial<Record<Vue, Buffer>>): Promise<boolean> {
  await assurerBucket()
  for (const vue of VUES) {
    const img = images[vue]
    if (!img) continue
    const { error } = await supabaseAdmin.storage.from(BUCKET).upload(`${slug}/${vue}.jpg`, img, { contentType: 'image/jpeg', upsert: true })
    if (error) return false
  }
  return true
}

export async function lireApercu(slug: string, vue: Vue): Promise<Buffer | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(`${slug}/${vue}.jpg`)
  if (error || !data) return null
  return Buffer.from(await data.arrayBuffer())
}

export async function supprimerApercus(slug: string): Promise<void> {
  await supabaseAdmin.storage.from(BUCKET).remove([...VUES.map((v) => `${slug}/${v}.jpg`), `${slug}/page.html`])
}

// Page .html : envoyée directement dans le bucket par une adresse signée (la limite de 4,5 Mo des fonctions Vercel ne s'applique pas).
export async function adresseDepotPage(slug: string): Promise<string | null> {
  await assurerBucket()
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(`${slug}/page.html`, { upsert: true })
  return error || !data ? null : data.signedUrl
}

export async function pageExiste(slug: string): Promise<boolean> {
  const { data } = await supabaseAdmin.storage.from(BUCKET).list(slug, { search: 'page.html' })
  return !!data?.some((f) => f.name === 'page.html')
}

// Adresse de téléchargement valable 5 minutes (le fichier s'enregistre, il ne s'affiche pas : Supabase sert le HTML en texte brut).
export async function adresseTelechargementPage(slug: string, nom: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(`${slug}/page.html`, 300, { download: nom })
  return error || !data ? null : data.signedUrl
}

// Filigrane diagonal répété « Maquette La Gabare - non publiée », posé sur la copie envoyée (l'original reste intact).
export async function filigraner(img: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(img).metadata()
  if (!width || !height) return img
  const taille = Math.max(14, Math.round(width / 28))
  const pasX = taille * 20
  const pasY = taille * 7
  const texte = 'Maquette La Gabare - non publiée'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
<defs><pattern id="f" width="${pasX}" height="${pasY}" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
<text x="0" y="${taille}" font-family="DejaVu Sans, Arial, sans-serif" font-size="${taille}" font-weight="bold" fill="#ffffff" fill-opacity="0.55" stroke="#2A0810" stroke-opacity="0.35" stroke-width="1">${texte}</text>
</pattern></defs><rect width="100%" height="100%" fill="url(#f)"/></svg>`
  return sharp(img).composite([{ input: Buffer.from(svg) }]).jpeg({ quality: 85 }).toBuffer()
}
