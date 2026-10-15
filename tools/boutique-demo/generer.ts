// Génère les pages boutique de démonstration dans un dossier de site (sans base de données)
// npx tsx --conditions=react-server tools/boutique-demo/generer.ts "<dossier du site>"
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { pageBoutique, pageCuvee } from '../../lib/boutique/publier'
import type { Produit } from '../../lib/boutique/core'

const dossier = process.argv[2]
const client = { nom_domaine: 'Domaine Moreau', domaine: 'domainemoreau.fr' }
const base = { client_id: 0, contenance: '75 cl', tva_taux: 20, bouteilles_par_unite: 1, seuil_alerte: 12, image_url: null, actif: true, appellation: 'Montlouis-sur-Loire AOC' }
const produits: Produit[] = [
  { ...base, id: 1, ordre: 1, slug: 'argile-blanc', nom: "L'Argile Blanc", millesime: '2023', couleur: 'Blanc sec', prix_cents: 1250, stock: 140,
    description: "Chenin blanc sur argile à silex. Citron confit, poire williams et fleurs blanches, une bouche vive, minérale et saline.\n\nFermentation en cuve inox, élevage six mois sur lies fines.", accords: 'Poissons grillés, crustacés, chèvre frais.' },
  { ...base, id: 2, ordre: 2, slug: 'les-tuffeaux', nom: 'Les Tuffeaux', millesime: '2022', couleur: 'Blanc demi-sec', prix_cents: 1400, stock: 8,
    description: "Le demi-sec du tuffeau : coing, miel d'acacia et une acidité qui tient le sucre en équilibre.", accords: 'Cuisine épicée, volaille à la crème, tarte aux pommes.' },
  { ...base, id: 3, ordre: 3, slug: 'grain-noble', nom: 'Grain Noble', millesime: '2020', couleur: 'Blanc moelleux', prix_cents: 2200, stock: 36,
    description: 'Vendanges par tries successives. Abricot sec, safran et une longue finale fraîche.', accords: 'Foie gras, roquefort, desserts aux fruits jaunes.' },
  { ...base, id: 4, ordre: 4, slug: 'petillant-brut', nom: 'Pétillant Brut', millesime: null, couleur: 'Effervescent', prix_cents: 1600, stock: 0,
    description: 'Méthode traditionnelle, 18 mois sur lattes. Bulles fines, pomme verte et brioche.', accords: "À l'apéritif, avec des huîtres." },
]
const modele = readFileSync(join(dossier, 'boutique-modele.html'), 'utf-8')
writeFileSync(join(dossier, 'boutique.html'), pageBoutique(modele, client, produits))
for (const p of produits) writeFileSync(join(dossier, `cuvee-${p.slug}.html`), pageCuvee(modele, client, p))
console.log(`${produits.length + 1} pages générées dans ${dossier}`)
