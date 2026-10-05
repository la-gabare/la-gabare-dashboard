import 'server-only'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.GABARE_SERVICE_ROLE_KEY

if (!url || !key) throw new Error('Missing Supabase server environment variables')

// Client dédié au module Prospection : Next.js met en cache les requêtes fetch identiques,
// ce qui figerait les statistiques. `no-store` garantit des données à jour.
export const prospectionDb = createClient(url, key, {
  auth: { persistSession: false },
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
})
