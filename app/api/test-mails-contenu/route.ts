import { NextRequest, NextResponse } from 'next/server'
import { envoyerMailsDuMoisEnEssai } from '@/lib/mails-contenu'

export const dynamic = 'force-dynamic'

// Essai des mails de contenu : /api/test-mails-contenu?client=ID envoie l'aperçu et le programme du mois
// (objets préfixés [ESSAI]) au contact du client. Route protégée par la connexion de l'admin ; ne modifie aucune donnée.
export async function GET(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get('client'))
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Paramètre client manquant' }, { status: 400 })
  const r = await envoyerMailsDuMoisEnEssai(id)
  return NextResponse.json(r, { status: r.ok ? 200 : 400 })
}
