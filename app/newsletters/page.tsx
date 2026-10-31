import { redirect } from 'next/navigation'

export default function NewslettersPage() {
  redirect('/contenu?onglet=newsletters')
}
