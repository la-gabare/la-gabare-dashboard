import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function ensureBucketExists(bucketName: string) {
  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`
    const headers = {
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: bucketName,
        public: true,
      })
    })

    if (response.ok) {
      console.log(`Bucket ${bucketName} created`)
      return true
    }

    const data = await response.json()
    if (data.message?.includes('already exists')) {
      console.log(`Bucket ${bucketName} already exists`)
      return true
    }

    console.error(`Failed to create bucket: ${data.message}`)
    return false
  } catch (err) {
    console.error('Bucket creation error:', err)
    return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const bucketName = 'media'

    // Instagram's Content Publishing API only accepts JPEG for image_url, so
    // every image is normalized to JPEG regardless of what was uploaded.
    let buffer: Buffer | ArrayBuffer = Buffer.from(arrayBuffer)
    let contentType = file.type
    let fileName = file.name

    if (file.type.startsWith('image/') && file.type !== 'image/jpeg') {
      buffer = await sharp(Buffer.from(arrayBuffer)).jpeg({ quality: 90 }).toBuffer()
      contentType = 'image/jpeg'
      fileName = fileName.replace(/\.[^.]+$/, '') + '.jpg'
    }

    const filename = `${type}/${Date.now()}_${fileName}`

    let uploadResult = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filename, buffer, {
        contentType,
        upsert: true,
      })

    if (uploadResult.error && uploadResult.error.message?.includes('Bucket not found')) {
      console.log('Bucket not found, attempting to create...')
      const created = await ensureBucketExists(bucketName)

      if (!created) {
        return NextResponse.json({
          error: 'Bucket does not exist and could not be created'
        }, { status: 400 })
      }

      uploadResult = await supabaseAdmin.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType,
          upsert: true,
        })
    }

    if (uploadResult.error) {
      console.error('Upload error:', uploadResult.error)
      return NextResponse.json({
        error: `Upload failed: ${uploadResult.error.message}`
      }, { status: 400 })
    }

    const { data: publicUrl } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filename)

    return NextResponse.json({
      url: publicUrl.publicUrl,
      filename: uploadResult.data?.path,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({
      error: `Server error: ${err instanceof Error ? err.message : 'Unknown'}`
    }, { status: 500 })
  }
}
