const nextConfig = {
  reactStrictMode: true,
  // instrumentation.ts : alertes e-mail sur les erreurs serveur
  experimental: { instrumentationHook: true },
}

module.exports = nextConfig
