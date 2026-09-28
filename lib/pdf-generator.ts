import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

type PDFDocumentType = InstanceType<typeof PDFDocument>

export async function generateTutorialPDF(outputPath: string, clientName: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 50, right: 50 }
      })

      const stream = fs.createWriteStream(outputPath)

      stream.on('error', reject)
      doc.on('error', reject)

      doc.pipe(stream)

      doc.fontSize(28).font('Helvetica-Bold').fillColor('#b08d57').text('La Gabare', { align: 'center' })
      doc.fontSize(14).fillColor('#b08d57').text('Guide de déploiement', { align: 'center' })
      doc.moveDown(0.5)

      doc.fontSize(12).fillColor('#000').font('Helvetica').text(`Site web : ${clientName}`, { align: 'center' })
      doc.fontSize(10).fillColor('#666').text(`Créé le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' })
      doc.moveDown(1.5)

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#b08d57')
      doc.moveDown(1)

      addSection(doc, '1. Préparation avant déploiement', [
        'Vous avez reçu vos identifiants FTP par email',
        'Ces identifiants permettent d\'uploader votre site sur le serveur',
        'Conservez-les précieusement et ne les partagez pas'
      ])

      addSection(doc, '2. Informations FTP', [
        'Serveur FTP : ftp.votre-domaine.com',
        'Identifiant : [À compléter avec vos identifiants]',
        'Mot de passe : [À compléter avec vos identifiants]',
        'Port : 21 (standard) ou 990 (SFTP sécurisé)'
      ])

      addSection(doc, '3. Fichiers du site', [
        'index.html → Page d\'accueil',
        'domaine.html → Présentation du domaine',
        'cuvees.html → Galerie des cuvées',
        'contact.html → Formulaire de contact',
        'css/style.css → Feuille de styles (couleurs, polices, mise en page)',
        'js/main.js → Interactions JavaScript (formulaires, navigation)',
        'images/ → Dossier contenant toutes les images du site'
      ])

      addSection(doc, '4. Paramètres à personnaliser', [
        'Email de contact → Remplacer par votre adresse email professionnelle',
        'Numéro de téléphone → Votre numéro du domaine',
        'Horaires d\'ouverture → Horaires du caveau ou visites',
        'Adresse complète → Adresse du domaine',
        'Lien boutique → URL de votre boutique WooCommerce (si applicable)'
      ], true)

      addSection(doc, '5. Étapes de déploiement pas à pas', [
        '1. Télécharger FileZilla ou un client FTP (gratuit)',
        '2. Ouvrir le client FTP et entrer vos identifiants',
        '3. Vous connecter au serveur',
        '4. Naviguer vers le dossier racine (public_html/ ou www/)',
        '5. Télécharger tous les fichiers du site dans ce dossier',
        '6. Attendre la fin du téléchargement (les images peuvent prendre du temps)',
        '7. Ouvrir votre domaine dans le navigateur',
        '8. Vérifier que tout s\'affiche correctement'
      ], true)

      addSection(doc, '6. Dépannage courant', [
        '❌ Images qui ne s\'affichent pas → Vérifier que le dossier images/ est uploadé',
        '❌ CSS qui ne s\'applique pas → Vider le cache du navigateur (Ctrl+Maj+Suppr)',
        '❌ Liens morts → Vérifier les chemins relatifs dans les fichiers HTML',
        '❌ Erreurs 404 → S\'assurer que tous les fichiers ont été uploadés',
        '❌ Site lent → Compresser les images ou augmenter l\'espace serveur'
      ], true)

      addSection(doc, '7. Après le déploiement', [
        'Tester tous les liens (accueil, pages, formulaires, images)',
        'Vérifier l\'affichage sur mobile, tablette et desktop',
        'Tester le formulaire de contact',
        'Vérifier le référencement Google (Google Search Console)',
        'Mettre en place Google Analytics pour suivre les visites'
      ])

      doc.moveDown(2)
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#b08d57')
      doc.moveDown(0.5)

      doc.fontSize(10).fillColor('#666').text('Support et questions', { align: 'center' })
      doc.fontSize(9).fillColor('#999').text('contact@la-gabare.fr', { align: 'center' })
      doc.fontSize(9).fillColor('#999').text('Document généré par La Gabare - ' + new Date().toLocaleDateString('fr-FR'), { align: 'center' })

      doc.end()

      stream.on('finish', () => resolve())
    } catch (error) {
      reject(error)
    }
  })
}

function addSection(doc: PDFDocumentType, title: string, items: string[], numbered = false) {
  doc.fontSize(13).font('Helvetica-Bold').fillColor('#b08d57').text(title)
  doc.moveDown(0.3)

  items.forEach((item, idx) => {
    const bullet = numbered ? `${idx + 1}. ` : '• '
    doc.fontSize(11).font('Helvetica').fillColor('#000').text(bullet + item, {
      indent: 20
    })
  })

  doc.moveDown(0.8)
}
