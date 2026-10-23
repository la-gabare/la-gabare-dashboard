import { NextRequest, NextResponse } from 'next/server'
import { publierPostsProgrammes } from '@/lib/posts-programmes'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Publication des posts programmés — appelé chaque jour par Vercel Cron (vercel.json).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  return NextResponse.json(await publierPostsProgrammes())
}
