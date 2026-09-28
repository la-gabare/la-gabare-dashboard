import { jsPDF } from 'jspdf'
import fs from 'fs'
import path from 'path'

export async function generateTutorialPDF(outputPath: string, clientName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 15
      const contentWidth = pageWidth - (margin * 2)
      let pageNum = 1

      const addPageNumber = () => {
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Page ${pageNum}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      const addHeader = (yPos: number) => {
        doc.setFontSize(28)
        doc.setTextColor(176, 141, 87)
        doc.text('La Gabare', margin, yPos)
        doc.setFontSize(11)
        doc.setTextColor(100, 100, 100)
        doc.text('TUTORIEL - Mettre en ligne votre site', margin, yPos + 10)
        return yPos + 18
      }

      const addSubtitle = (text: string, yPos: number) => {
        doc.setFontSize(12)
        doc.setTextColor(0, 0, 0)
        doc.text(text, margin, yPos)
        return yPos + 8
      }

      const addSectionTitle = (title: string, yPos: number) => {
        if (yPos > pageHeight - 50) {
          doc.addPage()
          pageNum++
          yPos = 20
          addPageNumber()
        }

        doc.setFontSize(13)
        doc.setTextColor(176, 141, 87)
        doc.setFont(undefined, 'bold')
        doc.text(title, margin, yPos)
        doc.setFont(undefined, 'normal')
        return yPos + 8
      }

      const addContent = (text: string, yPos: number) => {
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)
        const lines = doc.splitTextToSize(text, contentWidth)
        doc.text(lines, margin, yPos)
        return yPos + (lines.length * 5) + 3
      }

      const addBulletList = (items: string[], yPos: number) => {
        doc.setFontSize(10)
        doc.setTextColor(0, 0, 0)

        items.forEach(item => {
          if (yPos > pageHeight - 20) {
            addPageNumber()
            doc.addPage()
            pageNum++
            yPos = 20
          }

          const lines = doc.splitTextToSize('• ' + item, contentWidth - 5)
          doc.text(lines, margin + 5, yPos)
          yPos += (lines.length * 5) + 2
        })

        return yPos + 3
      }

      const addDivider = (yPos: number) => {
        doc.setDrawColor(176, 141, 87)
        doc.line(margin, yPos, pageWidth - margin, yPos)
        return yPos + 5
      }

      let y = addHeader(15)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Site web : ${clientName}`, margin, y)
      doc.text(`Créé le ${new Date().toLocaleDateString('fr-FR')}`, margin, y + 6)
      y += 15

      y = addDivider(y)
      y += 5

      y = addSectionTitle('1. Avant de commencer', y)
      y = addBulletList([
        'Vous avez reçu 2 fichiers texte : prompt-vitrine.txt et prompt-woocommerce.txt',
        'Vous aurez besoin d\'un compte Claude (claude.ai) - gratuit ou payant',
        'Prévoyez 30-45 minutes pour créer les 2 sites (vitrine + boutique)'
      ], y)
      y += 5

      y = addSectionTitle('2. Créer un chat Claude pour votre site', y)
      y = addContent('Allez sur claude.ai et créez un nouveau chat dédié à votre projet :', y)
      y += 3
      y = addBulletList([
        '1. Allez sur claude.ai dans votre navigateur',
        '2. Cliquez sur "+ New chat" (en haut à gauche)',
        '3. Nommez le chat : "[CLIENT] Domaine - Création site" (remplacez par votre nom)',
        '4. Gardez ce chat ouvert, vous l\'utiliserez pour les 2 sites'
      ], y)
      y += 5

      y = addSectionTitle('3. Fichiers de prompts fournis', y)
      y = addContent('Vous avez 2 fichiers texte à utiliser avec Claude :', y)
      y += 3
      y = addBulletList([
        'prompt-vitrine.txt : Contient TOUS les détails pour créer votre site principal',
        'prompt-woocommerce.txt : Contient les détails pour créer votre boutique en ligne',
        'Les 2 fichiers incluent : client info, cuvées, styles, prix, arômes, images'
      ], y)
      y += 5

      y = addSectionTitle('4. Étape 1 : Créer votre site vitrine', y)
      y += 3
      y = addBulletList([
        '1. Dans votre chat Claude, cliquez sur le bouton "+" pour ajouter un fichier',
        '2. Sélectionnez "prompt-vitrine.txt"',
        '3. Collez ce texte dans le chat : "Utilise ce prompt pour créer mon site"',
        '4. Attendez que Claude génère le code (5-10 minutes)',
        '5. Claude va créer index.html, domaine.html, cuvees.html, contact.html, css/, js/, etc.',
        '6. Téléchargez chaque fichier en cliquant sur le bouton télécharger dans Claude'
      ], y)
      y += 8

      addPageNumber()
      pageNum++
      y = 20

      y = addSectionTitle('5. Étape 2 : Créer votre boutique WooCommerce', y)
      y += 3
      y = addBulletList([
        '1. Dans le MÊME chat Claude (ou un nouveau si vous préférez)',
        '2. Cliquez sur "+" et sélectionnez "prompt-woocommerce.txt"',
        '3. Écrivez : "Utilise ce prompt pour créer ma boutique WooCommerce"',
        '4. Attendez que Claude génère le code boutique (10-15 minutes)',
        '5. Claude va créer les fichiers boutique avec le design cohérent',
        '6. Téléchargez tous les fichiers générés'
      ], y)
      y += 8

      y = addSectionTitle('6. Uploader les fichiers sur Hostinger', y)
      y += 3
      y = addContent('Une fois vos fichiers créés par Claude, uploadez-les :', y)
      y += 3
      y = addBulletList([
        '1. Connectez-vous à votre hPanel (panneau Hostinger)',
        '2. Allez dans Fichiers → Gestionnaire de fichiers',
        '3. Ouvrez le dossier "public_html"',
        '4. Uploadez tous les fichiers site vitrine',
        '5. Uploadez tous les fichiers boutique WooCommerce',
        '6. Attendez la fin de l\'upload (10-20 minutes selon la taille)',
        '7. Ouvrez votre domaine dans un navigateur pour vérifier'
      ], y)
      y += 8

      y = addSectionTitle('7. Dépannage courant', y)
      y += 3

      const issues = [
        'Images qui ne s\'affichent ? Assurez-vous que le dossier "images/" est uploadé',
        'CSS/Styles ne s\'appliquent pas ? Videz le cache du navigateur (Ctrl+Maj+Suppr)',
        'Liens cassés ? Vérifiez que tous les fichiers ont bien été uploadés avec les bons chemins',
        'Erreur 404 ? Tous les fichiers doivent être dans public_html ou un sous-dossier',
        'Site lent ? Optimisez vos images ou compressez-les avant l\'upload'
      ]

      y = addBulletList(issues, y)
      y += 8

      addPageNumber()
      doc.addPage()
      pageNum++
      y = 20

      y = addSectionTitle('8. Points importants', y)
      y += 3

      y = addBulletList([
        'Les 2 prompts contiennent TOUS les détails de votre domaine (prix, cuvées, styles)',
        'Claude va créer du code HTML/CSS/JS personnalisé pour vous',
        'Vérifiez que le site vitrine et la boutique ont le même design',
        'Testez tous les liens entre vitrine et boutique',
        'N\'oubliez pas de remplir le formulaire de contact avec votre email réel'
      ], y)
      y += 8

      y = addSectionTitle('9. Support et ressources', y)
      y += 3

      y = addContent('En cas de problème ou de question :', y)
      y += 5

      doc.setFontSize(11)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('La Gabare', margin, y)
      doc.setFont(undefined, 'normal')
      y += 6

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('contact@la-gabare.fr', margin, y)
      y += 6

      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text('Nous sommes à votre disposition pour vous aider.', margin, y)

      addPageNumber()

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      fs.writeFileSync(outputPath, pdfBuffer)
      resolve()

    } catch (error) {
      reject(error)
    }
  })
}
