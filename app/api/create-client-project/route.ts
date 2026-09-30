import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { generateTutorialPDF } from '@/lib/pdf-generator'

const JSZip = require('jszip')

export async function POST(request: NextRequest) {
  const tempDir = path.join('/tmp', `project-${Date.now()}`)

  try {
    const { client_name, client_id, project_slug, prompt, legalDocs } = await request.json()

    if (!client_name || !client_id) {
      return NextResponse.json(
        { success: false, error: 'Client name and ID are required' },
        { status: 400 }
      )
    }

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const projectName = `Site du client - ${client_name}`
    const projectDir = path.join(tempDir, projectName)

    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const subDirs = ['site', 'images', 'assets']
    subDirs.forEach(dir => {
      const dirPath = path.join(projectDir, dir)
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true })
      }
    })

    const pdfPath = path.join(projectDir, 'TUTORIEL - Mettre en ligne le site.pdf')
    await generateTutorialPDF(pdfPath, client_name)

    fs.writeFileSync(
      path.join(projectDir, 'prompt-vitrine.txt'),
      prompt || 'Aucun prompt fourni'
    )

    // Écrire les documents légaux
    if (legalDocs) {
      fs.writeFileSync(
        path.join(projectDir, 'mentions-legales.txt'),
        legalDocs.mentions_legales || ''
      )
      fs.writeFileSync(
        path.join(projectDir, 'cgv.txt'),
        legalDocs.cgv || ''
      )
      fs.writeFileSync(
        path.join(projectDir, 'politique-cookies.txt'),
        legalDocs.politique_cookies || ''
      )
      fs.writeFileSync(
        path.join(projectDir, 'politique-confidentialite.txt'),
        legalDocs.politique_confidentialite || ''
      )
      fs.writeFileSync(
        path.join(projectDir, 'cgu.txt'),
        legalDocs.cgu || ''
      )
    }

    const configFile = {
      client_name,
      client_id,
      project_slug,
      created_at: new Date().toISOString(),
      chat_name: `[CLIENT] ${client_name} - Création site`,
      files: {
        prompt_vitrine: 'prompt-vitrine.txt',
        tutoriel: 'TUTORIEL - Mettre en ligne le site.pdf'
      }
    }

    fs.writeFileSync(
      path.join(projectDir, 'project-config.json'),
      JSON.stringify(configFile, null, 2)
    )

    const zip = new JSZip()
    await addDirectoryToZip(zip, projectDir, projectName)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })
    const zipPath = path.join(tempDir, `${projectName}.zip`)
    fs.writeFileSync(zipPath, zipBuffer)

    const zipData = fs.readFileSync(zipPath)
    const base64Zip = zipData.toString('base64')

    fs.rmSync(tempDir, { recursive: true, force: true })

    return NextResponse.json({
      success: true,
      zipData: base64Zip,
      fileName: `${projectName}.zip`,
      chatName: `[CLIENT] ${client_name} - Création site`,
      message: 'Projet créé - ZIP généré avec succès'
    })

  } catch (error) {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
    console.error('Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: `Erreur: ${(error as Error).message}`
      },
      { status: 500 }
    )
  }
}

async function addDirectoryToZip(zip: any, dirPath: string, dirName: string) {
  const files = fs.readdirSync(dirPath)

  for (const file of files) {
    const filePath = path.join(dirPath, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      const folder = zip.folder(file)
      await addDirectoryToZip(folder, filePath, file)
    } else {
      const content = fs.readFileSync(filePath)
      zip.file(file, content)
    }
  }
}
