// Comparaison de deux textes en temps constant (jetons, clés API) : évite de deviner une clé par le temps de réponse.
export function egal(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let r = 0
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return r === 0
}
