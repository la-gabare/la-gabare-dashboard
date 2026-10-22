// Exécuté une fois au démarrage de chaque instance serveur (Next.js 14 : experimental.instrumentationHook)
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { installerAlertes } = await import('./lib/alertes')
    installerAlertes()
  }
}
