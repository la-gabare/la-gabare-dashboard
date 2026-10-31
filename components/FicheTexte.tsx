import type { ReactNode } from 'react'

// Affiche la fiche d'un prospect (texte au format Markdown simple : titres, listes, tableaux, gras) sans HTML brut.
function enligne(t: string): ReactNode[] {
  return t.split(/(\*\*[^*]+\*\*)/g).map((m, i) => (m.startsWith('**') && m.endsWith('**') && m.length > 4 ? <b key={i}>{m.slice(2, -2)}</b> : m))
}

const estTableau = (l: string) => l.trim().startsWith('|')
const cellules = (l: string) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

export default function FicheTexte({ texte }: { texte: string }) {
  const lignes = texte.split('\n')
  const blocs: ReactNode[] = []
  for (let i = 0; i < lignes.length; i++) {
    const l = lignes[i]
    if (!l.trim()) continue
    if (/^#{1,6}\s/.test(l)) {
      blocs.push(<h3 key={i} className="font-bold text-wine mt-4 mb-1">{enligne(l.replace(/^#+\s*/, ''))}</h3>)
    } else if (estTableau(l)) {
      const lot: string[] = []
      while (i < lignes.length && estTableau(lignes[i])) lot.push(lignes[i++])
      i--
      const lignesTab = lot.filter((x) => !cellules(x).every((c) => /^:?-+:?$/.test(c)))
      blocs.push(
        <div key={i} className="overflow-x-auto"><table className="text-xs w-full"><tbody>
          {lignesTab.map((x, k) => (
            <tr key={k} className="border-b align-top">{cellules(x).map((c, j) => <td key={j} className={`py-1 pr-3 ${k === 0 || j === 0 ? 'font-semibold' : ''}`}>{enligne(c)}</td>)}</tr>
          ))}
        </tbody></table></div>,
      )
    } else if (/^\s*[-*]\s/.test(l)) {
      const lot: string[] = []
      while (i < lignes.length && /^\s*[-*]\s/.test(lignes[i])) lot.push(lignes[i++].replace(/^\s*[-*]\s+/, ''))
      i--
      blocs.push(<ul key={i} className="list-disc pl-5 space-y-1">{lot.map((x, k) => <li key={k}>{enligne(x)}</li>)}</ul>)
    } else {
      blocs.push(<p key={i}>{enligne(l)}</p>)
    }
  }
  return <div className="space-y-2 text-sm">{blocs}</div>
}
