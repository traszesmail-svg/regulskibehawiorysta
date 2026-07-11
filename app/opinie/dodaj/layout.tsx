import type { Metadata } from 'next'
import { buildTechnicalMetadata } from '@/lib/seo'

export const metadata: Metadata = buildTechnicalMetadata({
  title: 'Dodaj opinię',
  path: '/opinie/dodaj',
  description: 'Formularz dodania opinii po konsultacji behawioralnej. Strona techniczna bez indeksowania.',
  noIndex: true,
  follow: false,
})

export default function AddOpinionLayout({ children }: { children: React.ReactNode }) {
  return children
}