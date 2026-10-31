import { NextResponse } from 'next/server'
import { chargerADecider } from '@/lib/a-decider'

export const dynamic = 'force-dynamic'

// Liste « À décider » de l'écran d'accueil (protégée par le mot de passe de l'admin via le middleware).
export async function GET() {
  return NextResponse.json(await chargerADecider())
}
