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
      let currentPage = 1

      const addPageNumber = () => {
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(`Page ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' })
      }

      const newPage = () => {
        addPageNumber()
        doc.addPage()
        currentPage++
        return 20
      }

      // Page 1: Header
      doc.setFontSize(28)
      doc.setTextColor(176, 141, 87)
      doc.text('La Gabare', margin, 15)
      doc.setFontSize(11)
      doc.setTextColor(100, 100, 100)
      doc.text('TUTORIEL - Mettre en ligne votre site', margin, 28)

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Site web : ${clientName}`, margin, 40)
      doc.text(`Créé le ${new Date().toLocaleDateString('fr-FR')}`, margin, 46)

      doc.setDrawColor(176, 141, 87)
      doc.line(margin, 52, pageWidth - margin, 52)

      let y = 62

      // Section 1
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('1. Avant de commencer', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const items1 = [
        'Vous avez reçu 2 fichiers texte : prompt-vitrine.txt et prompt-woocommerce.txt',
        'Vous aurez besoin d\'un compte Claude (claude.ai) - gratuit ou payant',
        'Prévoyez 30-45 minutes pour créer les 2 sites (vitrine + boutique)'
      ]
      items1.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const lines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(lines, margin + 5, y)
        y += (lines.length * 5) + 4
      })
      y += 6

      // Section 2
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('2. Créer un chat Claude pour votre site', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contentText = 'Allez sur claude.ai et créez un nouveau chat dédié à votre projet :'
      const lines = doc.splitTextToSize(contentText, contentWidth)
      doc.text(lines, margin, y)
      y += (lines.length * 5) + 4

      const items2 = [
        '1. Allez sur claude.ai dans votre navigateur',
        '2. Cliquez sur "+ New chat" (en haut à gauche)',
        '3. Nommez le chat : "[CLIENT] Domaine - Création site" (remplacez par votre nom)',
        '4. Gardez ce chat ouvert, vous l\'utiliserez pour les 2 sites'
      ]
      items2.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 6

      // Section 3
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('3. Fichiers de prompts fournis', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contentText2 = 'Vous avez 2 fichiers texte à utiliser avec Claude :'
      const lines2 = doc.splitTextToSize(contentText2, contentWidth)
      doc.text(lines2, margin, y)
      y += (lines2.length * 5) + 4

      const items3 = [
        'prompt-vitrine.txt : Contient TOUS les détails pour créer votre site principal',
        'prompt-woocommerce.txt : Contient les détails pour créer votre boutique en ligne',
        'Les 2 fichiers incluent : client info, cuvées, styles, prix, arômes, images'
      ]
      items3.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 6

      // Section 4
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('4. Étape 1 : Créer votre site vitrine', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const items4 = [
        '1. Dans votre chat Claude, cliquez sur le bouton "+" pour ajouter un fichier',
        '2. Sélectionnez "prompt-vitrine.txt"',
        '3. Collez ce texte dans le chat : "Utilise ce prompt pour créer mon site"',
        '4. Attendez que Claude génère le code (5-10 minutes)',
        '5. Claude va créer index.html, domaine.html, cuvees.html, contact.html, css/, js/, etc.',
        '6. Téléchargez chaque fichier en cliquant sur le bouton télécharger dans Claude'
      ]
      items4.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 8

      // Page 2
      y = newPage()
      y += 10

      // Section 5
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('5. Étape 2 : Créer votre boutique WooCommerce', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const items5 = [
        '1. Dans le MÊME chat Claude (ou un nouveau si vous préférez)',
        '2. Cliquez sur "+" et sélectionnez "prompt-woocommerce.txt"',
        '3. Écrivez : "Utilise ce prompt pour créer ma boutique WooCommerce"',
        '4. Attendez que Claude génère le code boutique (10-15 minutes)',
        '5. Claude va créer les fichiers boutique avec le design cohérent',
        '6. Téléchargez tous les fichiers générés'
      ]
      items5.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 8

      // Section 6
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('6. Uploader les fichiers sur Hostinger', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contentText3 = 'Une fois vos fichiers créés par Claude, uploadez-les :'
      const lines3 = doc.splitTextToSize(contentText3, contentWidth)
      doc.text(lines3, margin, y)
      y += (lines3.length * 5) + 4

      const items6 = [
        '1. Connectez-vous à votre hPanel (panneau Hostinger)',
        '2. Allez dans Fichiers → Gestionnaire de fichiers',
        '3. Ouvrez le dossier "public_html"',
        '4. Uploadez tous les fichiers site vitrine',
        '5. Uploadez tous les fichiers boutique WooCommerce',
        '6. Attendez la fin de l\'upload (10-20 minutes selon la taille)',
        '7. Ouvrez votre domaine dans un navigateur pour vérifier'
      ]
      items6.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 8

      // Section 7
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('7. Dépannage courant', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const issues = [
        'Images qui ne s\'affichent pas ? Assurez-vous que le dossier "images/" est uploadé',
        'CSS/Styles ne s\'appliquent pas ? Videz le cache du navigateur (Ctrl+Maj+Suppr)',
        'Liens cassés ? Vérifiez que tous les fichiers ont bien été uploadés avec les bons chemins',
        'Erreur 404 ? Tous les fichiers doivent être dans public_html ou un sous-dossier',
        'Site lent ? Optimisez vos images ou compressez-les avant l\'upload'
      ]
      issues.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 8

      // Page 3
      y = newPage()
      y += 10

      // Section 8
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('8. Points importants', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const items8 = [
        'Les 2 prompts contiennent TOUS les détails de votre domaine (prix, cuvées, styles)',
        'Claude va créer du code HTML/CSS/JS personnalisé pour vous',
        'Vérifiez que le site vitrine et la boutique ont le même design',
        'Testez tous les liens entre vitrine et boutique',
        'N\'oubliez pas de remplir le formulaire de contact avec votre email réel'
      ]
      items8.forEach(item => {
        if (y > pageHeight - 30) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 4
      })
      y += 10

      // Section 9
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('9. Support et ressources', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contactText = 'En cas de problème ou de question :'
      const contactLines = doc.splitTextToSize(contactText, contentWidth)
      doc.text(contactLines, margin, y)
      y += (contactLines.length * 5) + 8

      doc.setFontSize(11)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('La Gabare', margin, y)
      doc.setFont(undefined, 'normal')
      y += 8

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      doc.text('contact@la-gabare.fr', margin, y)
      y += 7

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
