// En-têtes de sécurité sur toutes les pages et routes de l'admin.
// CSP volontairement limitée (pas de script-src : Next.js injecte des scripts en ligne) : elle interdit l'affichage
// de l'admin dans une page tierce (clickjacking), les <base> détournés et les objets embarqués.
const entetesSecurite = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
]

const nextConfig = {
  reactStrictMode: true,
  // instrumentation.ts : alertes e-mail sur les erreurs serveur (stable depuis Next 15, plus d'option à activer)
  async headers() {
    return [{ source: '/:path*', headers: entetesSecurite }]
  },
}

module.exports = nextConfig
