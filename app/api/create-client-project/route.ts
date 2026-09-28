import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { generateTutorialPDF } from '@/lib/pdf-generator'

export async function POST(request: NextRequest) {
  try {
    const { client_name, client_id, project_slug, prompt, promptWoo } = await request.json()

    if (!client_name || !client_id) {
      return NextResponse.json(
        { success: false, error: 'Client name and ID are required' },
        { status: 400 }
      )
    }

    let projectPath: string

    try {
      const desktopPath = path.join(os.homedir(), 'Desktop', 'Dossier Clients')
      const folderName = `Site du client - ${client_name}`
      projectPath = path.join(desktopPath, folderName)

      if (!fs.existsSync(desktopPath)) {
        fs.mkdirSync(desktopPath, { recursive: true })
      }

      if (!fs.existsSync(projectPath)) {
        fs.mkdirSync(projectPath, { recursive: true })
      }

      const subDirs = ['site', 'images', 'assets']
      subDirs.forEach(dir => {
        const dirPath = path.join(projectPath, dir)
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true })
        }
      })
    } catch (fsError) {
      console.error('Filesystem error:', fsError)
      return NextResponse.json(
        { success: false, error: `Impossible de créer le dossier: ${(fsError as Error).message}` },
        { status: 500 }
      )
    }

    try {
      const pdfPath = path.join(projectPath, 'TUTORIEL - Mettre en ligne le site.pdf')
      await generateTutorialPDF(pdfPath, client_name)
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError)
      return NextResponse.json(
        { success: false, error: `Erreur lors de la génération du PDF: ${(pdfError as Error).message}` },
        { status: 500 }
      )
    }

    try {
      fs.writeFileSync(
        path.join(projectPath, 'prompt-vitrine.txt'),
        prompt || 'Aucun prompt fourni'
      )

      fs.writeFileSync(
        path.join(projectPath, 'prompt-woocommerce.txt'),
        promptWoo || 'Aucun prompt fourni'
      )
    } catch (writeError) {
      console.error('File write error:', writeError)
      return NextResponse.json(
        { success: false, error: `Erreur lors de l'écriture des fichiers: ${(writeError as Error).message}` },
        { status: 500 }
      )
    }

    try {
      const configFile = {
        client_name,
        client_id,
        project_slug,
        folder_path: projectPath,
        created_at: new Date().toISOString(),
        chat_name: `[CLIENT] ${client_name} - Création site`,
        files: {
          prompt_vitrine: 'prompt-vitrine.txt',
          prompt_woocommerce: 'prompt-woocommerce.txt',
          tutoriel: 'TUTORIEL - Mettre en ligne le site.pdf'
        }
      }

      fs.writeFileSync(
        path.join(projectPath, 'project-config.json'),
        JSON.stringify(configFile, null, 2)
      )
    } catch (configError) {
      console.error('Config file error:', configError)
      return NextResponse.json(
        { success: false, error: `Erreur lors de la création du fichier config: ${(configError as Error).message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      folderPath: projectPath,
      chatName: `[CLIENT] ${client_name} - Création site`,
      message: 'Projet créé avec succès',
      files: {
        tutoriel: path.join(projectPath, 'TUTORIEL - Mettre en ligne le site.pdf'),
        promptVitrine: path.join(projectPath, 'prompt-vitrine.txt'),
        promptWoo: path.join(projectPath, 'prompt-woocommerce.txt')
      }
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Erreur serveur: ${(error as Error).message}`
      },
      { status: 500 }
    )
  }
}
