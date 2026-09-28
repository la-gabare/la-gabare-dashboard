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
        'Vous avez reçu vos identifiants FTP par email',
        'Conservez-les précieusement et ne les partagez pas',
        'Vous aurez besoin d\'un client FTP comme FileZilla (gratuit)'
      ], y)
      y += 5

      y = addSectionTitle('2. Vos identifiants FTP', y)
      y = addContent('Voici les informations pour vous connecter au serveur :', y)
      y += 3
      y = addBulletList([
        'Serveur : ftp.votre-domaine.com',
        'Identifiant : [À compléter avec vos identifiants]',
        'Mot de passe : [À compléter avec vos identifiants]',
        'Port : 21 (standard) ou 990 (SFTP sécurisé)'
      ], y)
      y += 5

      y = addSectionTitle('3. Les fichiers de votre site', y)
      y = addContent('Voici la structure de vos fichiers :', y)
      y += 3
      y = addBulletList([
        'index.html - Page d\'accueil',
        'domaine.html - Présentation du domaine',
        'cuvees.html - Galerie des cuvées',
        'contact.html - Formulaire de contact',
        'css/style.css - Feuille de styles (couleurs, polices)',
        'js/main.js - Interactions JavaScript',
        'images/ - Dossier contenant toutes les images'
      ], y)
      y += 5

      y = addSectionTitle('4. Avant le déploiement', y)
      y = addContent('Personnalisez ces paramètres dans index.html :', y)
      y += 3
      y = addBulletList([
        'Adresse email : votre@email-pro.fr',
        'Numéro de téléphone : votre numéro',
        'Horaires d\'ouverture : horaires du caveau',
        'Adresse complète : adresse du domaine',
        'Lien boutique : URL de votre boutique WooCommerce'
      ], y)
      y += 8

      addPageNumber()
      doc.addPage()
      pageNum++
      y = 20

      y = addSectionTitle('5. Étapes de déploiement (pas à pas)', y)
      y += 3

      const steps = [
        '1. Téléchargez FileZilla (gratuit) sur filezilla-project.org',
        '2. Ouvrez FileZilla',
        '3. Allez à Fichier → Gestionnaire de sites',
        '4. Cliquez "Nouveau site" et entrez vos identifiants FTP',
        '5. Connectez-vous au serveur',
        '6. Dans le volet de droite, naviguez jusqu\'à public_html/ ou www/',
        '7. Dans le volet de gauche, ouvrez votre dossier site/',
        '8. Sélectionnez tous les fichiers et glissez-les à droite',
        '9. Attendez la fin du téléchargement (les images peuvent prendre du temps)',
        '10. Ouvrez votre domaine dans un navigateur',
        '11. Vérifiez que tout s\'affiche correctement'
      ]

      y = addBulletList(steps, y)
      y += 8

      y = addSectionTitle('6. Dépannage courant', y)
      y += 3

      const issues = [
        'Les images ne s\'affichent pas ? Vérifiez que le dossier images/ a été uploadé avec le même chemin',
        'Le CSS ne s\'applique pas ? Videz le cache du navigateur (Ctrl+Maj+Suppr)',
        'Les liens sont morts ? Vérifiez les chemins relatifs dans les fichiers HTML',
        'Erreur 404 ? Assurez-vous que tous les fichiers ont bien été uploadés',
        'Le site est lent ? Compressez les images ou demandez plus d\'espace serveur'
      ]

      y = addBulletList(issues, y)
      y += 8

      y = addSectionTitle('7. Après le déploiement', y)
      y += 3

      y = addBulletList([
        'Testez tous les liens (pages, formulaires, images)',
        'Vérifiez l\'affichage sur mobile, tablette et ordinateur',
        'Testez le formulaire de contact',
        'Vérifiez le référencement Google (Google Search Console)',
        'Configurez Google Analytics pour suivre les visites'
      ], y)
      y += 8

      addPageNumber()
      doc.addPage()
      pageNum++
      y = 20

      y = addSectionTitle('8. Support et ressources', y)
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
