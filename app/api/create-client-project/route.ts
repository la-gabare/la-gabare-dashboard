import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { generateTutorialPDF } from '@/lib/pdf-generator'

const JSZip = require('jszip')

function generatePublishPhp(clientName: string, projectSlug: string, domainName?: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  return `<?php
/**
 * Publish API for ${clientName}
 * ${domainName ? `Domain: ${domainName}` : ''}
 * Allows Claude to publish articles directly to the site
 */

// Security token - change this to a unique value
define('PUBLISH_TOKEN', '${token}');
define('DOMAIN_NAME', '${domainName || clientName}');

// Verify token
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $headers = getallheaders();
  $auth = isset($headers['Authorization']) ? $headers['Authorization'] : '';

  if ($auth !== 'Bearer ' . PUBLISH_TOKEN) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
  }
}

// Handle incoming article data
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $input = json_decode(file_get_contents('php://input'), true);

  if (!isset($input['title']) || !isset($input['content'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing required fields: title, content']);
    exit;
  }

  $article = [
    'title' => sanitize($input['title']),
    'content' => $input['content'],
    'slug' => sanitize($input['slug'] ?? slugify($input['title'])),
    'date' => $input['date'] ?? date('Y-m-d H:i:s'),
    'author' => sanitize($input['author'] ?? 'Claude'),
    'status' => $input['status'] ?? 'published'
  ];

  // Save article to articles directory
  $articlesDir = __DIR__ . '/articles';
  if (!is_dir($articlesDir)) {
    mkdir($articlesDir, 0755, true);
  }

  $filename = date('Y-m-d-') . $article['slug'] . '.json';
  $filepath = $articlesDir . '/' . $filename;

  if (file_put_contents($filepath, json_encode($article, JSON_PRETTY_PRINT))) {
    http_response_code(201);
    echo json_encode([
      'success' => true,
      'message' => 'Article published successfully',
      'slug' => $article['slug'],
      'file' => $filename
    ]);
  } else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to publish article']);
  }
  exit;
}

// GET - list articles
$articlesDir = __DIR__ . '/articles';
$articles = [];

if (is_dir($articlesDir)) {
  $files = scandir($articlesDir);
  foreach ($files as $file) {
    if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
      $content = json_decode(file_get_contents($articlesDir . '/' . $file), true);
      $articles[] = [
        'title' => $content['title'] ?? '',
        'slug' => $content['slug'] ?? '',
        'date' => $content['date'] ?? '',
        'file' => $file
      ];
    }
  }
}

header('Content-Type: application/json');
echo json_encode(['articles' => $articles]);

function sanitize($string) {
  return htmlspecialchars(strip_tags($string), ENT_QUOTES, 'UTF-8');
}

function slugify($string) {
  $slug = strtolower($string);
  $slug = preg_replace('/[^a-z0-9]+/', '-', $slug);
  $slug = trim($slug, '-');
  return $slug;
}
?>`
}

function generateConfigPhp(clientName: string, projectSlug: string, domainName?: string): string {
  return `<?php
/**
 * Configuration for ${clientName} site
 * ${domainName ? `Domain: ${domainName}` : ''}
 */

// Site settings
define('SITE_NAME', '${clientName}');
define('SITE_DOMAIN', '${domainName || clientName}');
define('SITE_SLUG', '${projectSlug}');
define('SITE_URL', (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . (defined('SITE_DOMAIN') ? SITE_DOMAIN : $_SERVER['HTTP_HOST']));

// Directories
define('ROOT_DIR', __DIR__);
define('ARTICLES_DIR', ROOT_DIR . '/articles');
define('UPLOADS_DIR', ROOT_DIR . '/uploads');

// Article settings
define('ARTICLES_PER_PAGE', 10);
define('SHOW_DRAFT_ARTICLES', false);

// Publishing API
define('API_ENDPOINT', SITE_URL . '/publish.php');
define('PUBLISH_TOKEN', getenv('PUBLISH_TOKEN') ?: 'change-me-in-production');

// Cache settings
define('ENABLE_CACHE', true);
define('CACHE_DURATION', 3600); // 1 hour

// Ensure articles directory exists
if (!is_dir(ARTICLES_DIR)) {
  mkdir(ARTICLES_DIR, 0755, true);
}

if (!is_dir(UPLOADS_DIR)) {
  mkdir(UPLOADS_DIR, 0755, true);
}

// Helper function to get articles
function getArticles() {
  $articles = [];
  if (is_dir(ARTICLES_DIR)) {
    $files = scandir(ARTICLES_DIR, SCANDIR_SORT_DESCENDING);
    foreach ($files as $file) {
      if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
        $data = json_decode(file_get_contents(ARTICLES_DIR . '/' . $file), true);
        if (SHOW_DRAFT_ARTICLES || $data['status'] === 'published') {
          $articles[] = array_merge($data, ['file' => $file]);
        }
      }
    }
  }
  return $articles;
}

// Helper function to get single article
function getArticle(\$slug) {
  if (is_dir(ARTICLES_DIR)) {
    \$files = scandir(ARTICLES_DIR);
    foreach (\$files as \$file) {
      if (pathinfo(\$file, PATHINFO_EXTENSION) === 'json') {
        \$data = json_decode(file_get_contents(ARTICLES_DIR . '/' . \$file), true);
        if (\$data['slug'] === \$slug) {
          return \$data;
        }
      }
    }
  }
  return null;
}
?>`
}


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

    // Récupérer le domaine depuis les données du client
    const clientData = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/clients?id=eq.${client_id}`, {
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY}` }
    }).then(r => r.json()).catch(() => [])

    const domainName = clientData?.[0]?.site_url || clientData?.[0]?.site || clientData?.[0]?.nom_domaine || client_name
    const profileData = clientData?.[0]?.profil_client_complet as Record<string, any> || {}
    const detectedDomain = profileData?.site_url || profileData?.domaine || clientData?.[0]?.site || domainName

    // Créer publish.php dans le dossier site
    const publishPhp = generatePublishPhp(client_name, project_slug, detectedDomain)
    const publishPhpPath = path.join(projectDir, 'site', 'publish.php')
    fs.writeFileSync(publishPhpPath, publishPhp)
    console.log('Created publish.php at:', publishPhpPath, 'for domain:', detectedDomain)

    // Créer config.php dans le dossier site
    const configPhp = generateConfigPhp(client_name, project_slug, detectedDomain)
    const configPhpPath = path.join(projectDir, 'site', 'config.php')
    fs.writeFileSync(configPhpPath, configPhp)
    console.log('Created config.php at:', configPhpPath, 'for domain:', detectedDomain)

    // Créer .htaccess dans le dossier site pour router les requêtes
    const htaccess = `<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /site/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^publish$ publish.php [L]
</IfModule>`
    const htaccessPath = path.join(projectDir, 'site', '.htaccess')
    fs.writeFileSync(htaccessPath, htaccess)
    console.log('Created .htaccess at:', htaccessPath)

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
