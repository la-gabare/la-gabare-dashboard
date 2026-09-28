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
        '1. Ouvrez votre chat Claude dédié au projet',
        '2. Cliquez sur le bouton "+" pour ajouter un fichier',
        '3. Uploadez le fichier "prompt-vitrine.txt"',
        '4. Dans le chat, écrivez : "Utilise ce prompt pour créer mon site vitrine complet"',
        '5. Claude va analyser les données et générer le code (5-10 minutes)',
        '6. Vous recevrez les fichiers HTML (index.html, domaine.html, cuvees.html, contact.html)',
        '7. Vous recevrez aussi le dossier css/ avec style.css et le dossier js/ avec main.js',
        '8. Téléchargez chaque fichier en cliquant sur le bouton télécharger',
        '9. Organisez les fichiers dans un dossier "site-vitrine" sur votre ordinateur'
      ]
      items4.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Subsection: Structure du site vitrine
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(12)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('Structure du site vitrine créé :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 8

      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const structureItems = [
        'index.html → Page d\'accueil avec héros, présentation rapide',
        'domaine.html → Présentation du domaine, histoire, valeurs',
        'cuvees.html → Galerie complète de vos cuvées avec détails (prix, alcool, arômes)',
        'contact.html → Formulaire de contact et informations de contact',
        'css/style.css → Tous les styles (couleurs, polices, mise en page)',
        'js/main.js → Interactivité (menu responsive, animations, etc.)',
        'images/ → Dossier contenant toutes vos images (logo, domaine, cuvées)'
      ]
      structureItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
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
        '1. Restez dans le MÊME chat Claude (ou créez un nouveau pour organiser)',
        '2. Cliquez sur le bouton "+" pour ajouter le fichier "prompt-woocommerce.txt"',
        '3. Écrivez : "Utilise ce prompt pour créer ma boutique WooCommerce avec les mêmes styles"',
        '4. Claude va analyser et générer la boutique (10-15 minutes)',
        '5. Vous recevrez les fichiers WooCommerce (shop.html, product.html, cart.html, etc.)',
        '6. Vous recevrez aussi les fichiers de configuration pour intégrer les paiements',
        '7. Téléchargez tous les fichiers en cliquant sur les boutons télécharger',
        '8. Organisez les fichiers dans un dossier "boutique-woocommerce" sur votre ordinateur'
      ]
      items5.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Subsection: Intégration vitrine ↔ boutique
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(12)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('Intégration vitrine ↔ boutique :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 8

      doc.setFontSize(9)
      doc.setTextColor(0, 0, 0)
      const integrationItems = [
        'Sur le site vitrine (cuvees.html) → Bouton "Acheter" qui va vers la boutique',
        'Sur la boutique → Bouton "Retour au domaine" qui revient à domaine.html',
        'Même design et couleurs partout pour une expérience cohérente',
        'Les prix affichés sur la vitrine sont à jour avec la boutique',
        'Les informations de cuvée (alcool, arômes) sont identiques partout'
      ]
      integrationItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Section 6: hPanel
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('6. Uploader les fichiers avec hPanel (Hostinger)', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contentText3 = 'hPanel est le panneau de contrôle Hostinger. Voici comment l\'utiliser :'
      const lines3 = doc.splitTextToSize(contentText3, contentWidth)
      doc.text(lines3, margin, y)
      y += (lines3.length * 5) + 4

      // Subsection: Accès hPanel
      if (y > pageHeight - 40) y = newPage()
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('A) Se connecter à hPanel :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 7

      doc.setFontSize(9)
      const hpanelItems = [
        '1. Allez sur hpanel.hosting.com dans votre navigateur',
        '2. Entrez votre email Hostinger et votre mot de passe',
        '3. Cliquez sur "Se connecter"',
        '4. Vous êtes maintenant dans le panneau hPanel'
      ]
      hpanelItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 6

      // Subsection: Gestionnaire de fichiers
      if (y > pageHeight - 40) y = newPage()
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('B) Utiliser le Gestionnaire de fichiers :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 7

      doc.setFontSize(9)
      const fileManagerItems = [
        '1. Dans hPanel, cliquez sur "Fichiers" dans le menu de gauche',
        '2. Cliquez sur "Gestionnaire de fichiers"',
        '3. Double-cliquez sur le dossier "public_html"',
        '4. C\'est ici que va votre site (c\'est le dossier public visible sur le web)'
      ]
      fileManagerItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 6

      // Subsection: Upload des fichiers
      if (y > pageHeight - 40) y = newPage()
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('C) Uploader vos fichiers site :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 7

      doc.setFontSize(9)
      const uploadItems = [
        '1. Dans public_html, cliquez sur le bouton "Uploader des fichiers"',
        '2. Sélectionnez tous vos fichiers HTML (index.html, domaine.html, cuvees.html, contact.html)',
        '3. Uploadez le dossier "css/" complet',
        '4. Uploadez le dossier "js/" complet',
        '5. Uploadez le dossier "images/" avec toutes vos images',
        '6. Pour la boutique, créez un dossier "shop" et mettez les fichiers dedans',
        '7. Attendez que la barre de progression atteigne 100% (5-20 min selon la taille des images)',
        '8. Rafraîchissez la page (F5) pour voir les fichiers uploadés'
      ]
      uploadItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Section 7: Tester votre site
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('7. Tester votre site avant la mise en ligne', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const testItems = [
        'Ouvrez votre domaine dans le navigateur (ex: www.mondomaine.fr)',
        'Vérifiez que la page d\'accueil s\'affiche correctement',
        'Testez tous les liens de navigation (Domaine, Cuvées, Contact)',
        'Assurez-vous que les images s\'affichent bien',
        'Testez les couleurs et les fonts (doit correspondre à votre design choisi)',
        'Testez le formulaire de contact (envoyez un test)',
        'Sur mobile, vérifiez que le site s\'adapte bien (responsive design)',
        'Vérifiez les liens vers la boutique et leur bon fonctionnement',
        'Testez le panier et les paiements de la boutique'
      ]
      testItems.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Page 3
      y = newPage()
      y += 10

      // Section 8: SEO
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('8. Optimiser le SEO (Référencement Google)', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const contentTextSEO = 'Le SEO permet à votre site d\'apparaître sur Google quand les gens cherchent du vin.'
      const linesSEO = doc.splitTextToSize(contentTextSEO, contentWidth)
      doc.text(linesSEO, margin, y)
      y += (linesSEO.length * 5) + 6

      // Subsection: Éléments SEO dans le site
      if (y > pageHeight - 40) y = newPage()
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('A) Éléments SEO déjà inclus dans votre site :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 7

      doc.setFontSize(9)
      const seoItems1 = [
        'Titres HTML optimisés (h1, h2, h3) avec vos mots-clés',
        'Meta description : résumé du site visible sur Google',
        'Balises alt sur les images (important pour le SEO et l\'accessibilité)',
        'URLs amies (urls lisibles, pas des codes)',
        'Sitemap.xml pour aider Google à trouver vos pages',
        'robots.txt pour contrôler ce que Google peut crawler'
      ]
      seoItems1.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 6

      // Subsection: Actions à faire
      if (y > pageHeight - 40) y = newPage()
      doc.setFontSize(11)
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'bold')
      doc.text('B) Actions pour améliorer le SEO :', margin, y)
      doc.setFont(undefined, 'normal')
      y += 7

      doc.setFontSize(9)
      const seoItems2 = [
        '1. Google Search Console : Enregistrez votre domaine (console.google.com/google/search/console)',
        '2. Vérifiez que Google a bien indexé vos pages',
        '3. Soumettez votre sitemap.xml dans Google Search Console',
        '4. Google Analytics : Tracez les visiteurs et leur comportement',
        '5. Mots-clés : Utilisez des mots-clés pertinents (vin, Bourgogne, cuvée, etc.)',
        '6. Contenu : Écrivez du contenu de qualité et régulièrement mis à jour',
        '7. Liens : Encouragez les gens à faire des liens vers votre site',
        '8. Vitesse : Assurez-vous que votre site charge vite (images optimisées)'
      ]
      seoItems2.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 8

      // Section 9: Points importants
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('9. Points importants', margin, y)
      doc.setFont(undefined, 'normal')
      y += 10

      doc.setFontSize(10)
      doc.setTextColor(0, 0, 0)
      const items9 = [
        'Les 2 prompts contiennent TOUS les détails de votre domaine (prix, cuvées, styles)',
        'Claude crée du code HTML/CSS/JS personnalisé et unique pour vous',
        'Le design du site vitrine et de la boutique sont cohérents et liés',
        'Testez TOUS les liens entre vitrine et boutique avant de lancer',
        'Remplissez votre adresse email réelle dans le formulaire de contact',
        'Mettez des images de haute qualité (au moins 1920x1080px pour les héros)',
        'Gardez votre site à jour et ajoutez du nouveau contenu régulièrement',
        'N\'oubliez pas de renouveler votre domaine avant expiration (12 mois)'
      ]
      items9.forEach(item => {
        if (y > pageHeight - 25) y = newPage()
        const itemLines = doc.splitTextToSize('• ' + item, contentWidth - 5)
        doc.text(itemLines, margin + 5, y)
        y += (itemLines.length * 5) + 3
      })
      y += 10

      // Section 10
      if (y > pageHeight - 50) y = newPage()
      doc.setFontSize(13)
      doc.setTextColor(176, 141, 87)
      doc.setFont(undefined, 'bold')
      doc.text('10. Support et ressources', margin, y)
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
