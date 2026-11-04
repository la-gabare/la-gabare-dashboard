/* eslint-disable @next/next/no-img-element */
// Captures de la maquette d'un prospect (déposées par Harness Maxxing) ; un lien externe (démo en ligne) s'affiche en simple lien.
export default function MaquetteApercu({ url }: { url?: string }) {
  if (!url) return null
  const interne = url.startsWith('/api/prospects/maquette/')
  if (!interne) return <p><b>Maquette du site :</b> <a href={url} target="_blank" rel="noopener noreferrer" className="text-wine underline">{url}</a></p>
  const base = url.replace(/\/bureau$/, '')
  return (
    <div>
      <p className="font-semibold mb-1">Maquette du site (aperçu privé, non publié)</p>
      <div className="flex flex-wrap items-start gap-3">
        <a href={`${base}/bureau`} target="_blank" rel="noopener noreferrer"><img src={`${base}/bureau`} alt="Maquette, version ordinateur" className="rounded border w-full max-w-xl" /></a>
        <a href={`${base}/mobile`} target="_blank" rel="noopener noreferrer"><img src={`${base}/mobile`} alt="Maquette, version mobile" className="rounded border w-40" /></a>
      </div>
    </div>
  )
}
