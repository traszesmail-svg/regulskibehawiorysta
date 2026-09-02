import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Materiały dla opiekunów | Regulski Behawiorysta',
  description: 'Praktyczne materiały o zachowaniu psów i kotów.',
  robots: { index: false, follow: true },
}

export default function NewsletterPage() {
  redirect('/materialy')
}
