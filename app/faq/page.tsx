import type { Metadata } from 'next'
import { ReferenceFaq } from '@/components/ReferenceFaq'
import { ReferencePageShell } from '@/components/ReferencePageShell'
import { Schema } from '@/components/schema'
import { referenceFaqItems } from '@/lib/reference-faq'
import { getBreadcrumbJsonLd, getFaqPageJsonLd } from '@/lib/schema'
import { buildMarketingMetadata } from '@/lib/seo'

export const metadata: Metadata = buildMarketingMetadata({
  title: 'Najczęstsze pytania i odpowiedzi',
  path: '/faq',
  description: 'FAQ o konsultacjach behawioralnych online, pierwszym kontakcie, płatnościach, psach i kotach.',
})

const bookHref = '/'
const contactHref = '/kontakt#formularz'

export default function FaqPage() {
  return (
    <ReferencePageShell className="reference-faq-page" ctaHref={bookHref} showHeroLeaf>
      <Schema
        data={[
          getBreadcrumbJsonLd([
            { name: 'Strona główna', path: '/' },
            { name: 'FAQ', path: '/faq' },
          ]),
          getFaqPageJsonLd(referenceFaqItems),
        ]}
      />
      <ReferenceFaq contactHref={contactHref} />
    </ReferencePageShell>
  )
}
