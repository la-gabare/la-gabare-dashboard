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
      let yPosition = 20

      doc.setFontSize(24)
      doc.setTextColor(176, 141, 87)
      doc.text('La Gabare', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 10

      doc.setFontSize(14)
      doc.setTextColor(176, 141, 87)
      doc.text('Guide de déploiement', pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text(`Site web : ${clientName}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 8

      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Créé le ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' })
      yPosition += 15

      doc.setDrawColor(176, 141, 87)
      doc.line(20, yPosition, pageWidth - 20, yPosition)
      yPosition += 10

      addSection(doc, '1. Préparation avant déploiement', [
        'Vous avez reçu vos identifiants FTP par email',
        'Ces identifiants permettent d\'uploader votre site sur le serveur',
        'Conservez-les précieusement et ne les partagez pas'
      ], yPosition)
      yPosition += 35

      addSection(doc, '2. Informations FTP', [
        'Serveur FTP : ftp.votre-domaine.com',
        'Identifiant : [À compléter avec vos identifiants]',
        'Mot de passe : [À compléter avec vos identifiants]',
        'Port : 21 (standard) ou 990 (SFTP sécurisé)'
      ], yPosition)
      yPosition += 35

      addSection(doc, '3. Fichiers du site', [
        'index.html → Page d\'accueil',
        'domaine.html → Présentation du domaine',
        'cuvees.html → Galerie des cuvées',
        'contact.html → Formulaire de contact',
        'css/style.css → Feuille de styles',
        'js/main.js → Interactions JavaScript',
        'images/ → Dossier contenant les images'
      ], yPosition)
      yPosition += 45

      addSection(doc, '4. Paramètres à personnaliser', [
        'Email de contact → Votre email professionnel',
        'Numéro de téléphone → Numéro du domaine',
        'Horaires d\'ouverture → Horaires du caveau',
        'Adresse complète → Adresse du domaine',
        'Lien boutique → URL WooCommerce (si applicable)'
      ], yPosition)
      yPosition += 40

      addSection(doc, '5. Étapes de déploiement', [
        '1. Télécharger FileZilla (gratuit)',
        '2. Entrer vos identifiants FTP',
        '3. Vous connecter au serveur',
        '4. Naviguer vers public_html/ ou www/',
        '5. Télécharger tous les fichiers',
        '6. Attendre la fin du téléchargement',
        '7. Ouvrir votre domaine dans le navigateur',
        '8. Vérifier que tout s\'affiche correctement'
      ], yPosition)
      yPosition += 55

      addSection(doc, '6. Dépannage courant', [
        'Images qui ne s\'affichent pas → Vérifier dossier images/',
        'CSS qui ne s\'applique pas → Vider cache navigateur',
        'Liens morts → Vérifier chemins relatifs',
        'Erreurs 404 → Vérifier tous les fichiers uploadés',
        'Site lent → Compresser les images'
      ], yPosition)
      yPosition += 40

      doc.addPage()
      yPosition = 20

      addSection(doc, '7. Après le déploiement', [
        'Tester tous les liens (accueil, pages, formulaires)',
        'Vérifier l\'affichage mobile, tablette, desktop',
        'Tester le formulaire de contact',
        'Vérifier le référencement Google',
        'Mettre en place Google Analytics'
      ], yPosition)
      yPosition += 40

      doc.setFontSize(10)
      doc.setTextColor(102, 102, 102)
      doc.text('Support et questions', pageWidth / 2, pageHeight - 30, { align: 'center' })
      doc.setFontSize(9)
      doc.text('contact@la-gabare.fr', pageWidth / 2, pageHeight - 24, { align: 'center' })
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text(`Document généré par La Gabare - ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, pageHeight - 15, { align: 'center' })

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      fs.writeFileSync(outputPath, pdfBuffer)
      resolve()

    } catch (error) {
      reject(error)
    }
  })
}

function addSection(doc: jsPDF, title: string, items: string[], startY: number): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  let yPos = startY

  if (yPos > pageHeight - 60) {
    doc.addPage()
    yPos = 20
  }

  doc.setFontSize(13)
  doc.setTextColor(176, 141, 87)
  doc.text(title, 20, yPos)
  yPos += 8

  doc.setFontSize(10)
  doc.setTextColor(0, 0, 0)

  items.forEach((item) => {
    if (yPos > pageHeight - 20) {
      doc.addPage()
      yPos = 20
    }
    const lines = doc.splitTextToSize('• ' + item, pageWidth - 40)
    doc.text(lines, 20, yPos)
    yPos += lines.length * 5 + 2
  })

  yPos += 5
}
