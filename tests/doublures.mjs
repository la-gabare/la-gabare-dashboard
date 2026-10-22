// Doublures inertes de Stripe, Supabase, du mailer et du plan éditorial : tout appel pendant un test échoue clairement.
const interdit = (nom) => new Proxy(() => {}, {
  get: (_, cle) => (cle === 'then' ? undefined : interdit(`${nom}.${String(cle)}`)),
  apply: () => { throw new Error(`Appel réel interdit pendant les tests : ${nom}`) },
})
export const stripe = interdit('stripe')
export const supabaseAdmin = interdit('supabaseAdmin')
export const sendMail = interdit('sendMail')
export const lancerPlanEditorial = interdit('lancerPlanEditorial')
export default {}
