import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Vérification des alertes : ouvrir /api/test-alerte dans le navigateur (route protégée par la connexion de l'admin)
export async function GET() {
  console.error(`Test d'alerte déclenché depuis l'admin le ${new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' })}`)
  return NextResponse.json({ ok: true, message: 'Erreur de test enregistrée : un e-mail « Erreur dans l\'admin » doit arriver sur la boîte de l\'agence.' })
}
