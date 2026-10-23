import { NextRequest, NextResponse } from 'next/server'
import { envoyerNewslettersEnAttente } from '@/lib/newsletters-envoi'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Envoi des newsletters validées — appelé par Vercel Cron (vercel.json).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  return NextResponse.json(await envoyerNewslettersEnAttente())
}
