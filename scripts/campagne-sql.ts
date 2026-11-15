// Fabrique le SQL d'import de listes de prospects (CSV) dans la campagne. N'envoie rien, n'écrit pas en base.
// Usage : node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --import ./tests/charger.mjs scripts/campagne-sql.ts sortie.sql liste1.csv [liste2.csv ...]
import { readFileSync, writeFileSync } from 'node:fs'
import { lireCsv, sqlImport } from '@/lib/campagne'

const [sortie, ...csv] = process.argv.slice(2)
if (!sortie || !csv.length) { console.log('Usage : campagne-sql.ts sortie.sql liste.csv [...]'); process.exit(1) }
const lignes = csv.flatMap((f) => lireCsv(readFileSync(f, 'utf-8')))
const vus = new Set<string>()
const uniques = lignes.filter((d) => !vus.has(d.email) && vus.add(d.email))
writeFileSync(sortie, `-- Import campagne « présentation » : ${uniques.length} destinataires (e-mails professionnels publiés). À exécuter dans Supabase après sql/campagnes.sql.\n${sqlImport(uniques)}`)
console.log(`${uniques.length} destinataires (${lignes.length - uniques.length} doublons d'e-mail ignorés) -> ${sortie}`)
