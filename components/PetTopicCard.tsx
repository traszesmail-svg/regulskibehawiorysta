import Image from 'next/image'
import Link from 'next/link'
import { REGULSKI_WEB_TILE } from '@/lib/regulski-web-assets'

type PetKind = 'dog' | 'cat'
type TopicIconName = 'dog-reactivity' | 'dog-separation' | 'dog-puppy' | 'cat-litter' | 'cat-stress' | 'cat-conflict' | 'topic-other' | 'cat-other'

interface TopicLink {
  href: string
  icon: TopicIconName
  title: string
  desc: string
}

interface PetTopicCardProps {
  href: string
  icon: PetKind
  heading: string
  links: TopicLink[]
}

function PetTopicSymbol({ icon }: { icon: PetKind }) {
  if (icon === 'dog') {
    return <Image src={REGULSKI_WEB_TILE.dog} alt="" aria-hidden="true" width={720} height={720} className="notatnik-pet-symbol-image" />
  }

  return <Image src={REGULSKI_WEB_TILE.cat} alt="" aria-hidden="true" width={720} height={720} className="notatnik-pet-symbol-image" />
}

function PetTopicLinkIcon({ icon }: { icon: TopicIconName }) {
  return (
    <Image
      src={`/branding/pet-topics/subcategories/${icon}.png`}
      alt=""
      aria-hidden="true"
      width={126}
      height={126}
      className="notatnik-pet-topic-link-icon-image"
    />
  )
}

export function PetTopicCard({ href, icon, heading, links }: PetTopicCardProps) {
  return (
    <article className="notatnik-pet-topic-card">
      <header className="notatnik-pet-topic-head">
        <Link href={href} prefetch={false} className="notatnik-pet-topic-head-link">
          <h3>{heading}</h3>
          <span className="notatnik-pet-topic-icon" aria-hidden="true">
            <PetTopicSymbol icon={icon} />
          </span>
        </Link>
      </header>

      <div className="notatnik-pet-topic-links">
        {links.map((link) => (
          <Link key={link.href} href={link.href} prefetch={false} className="notatnik-pet-topic-link">
            <span className="notatnik-pet-topic-link-icon" aria-hidden="true">
              <PetTopicLinkIcon icon={link.icon} />
            </span>
            <span>
              <strong>{link.title}</strong>
              <small>{link.desc}</small>
            </span>
            <span className="notatnik-pet-topic-arrow" aria-hidden="true">&rarr;</span>
          </Link>
        ))}
      </div>
    </article>
  )
}

export function PetTopicsSection() {
  return (
    <section className="notatnik-pet-topic-grid">
      <PetTopicCard
        href="/zapytaj"
        icon="dog"
        heading="Pies"
        links={[
          { href: '#cennik', icon: 'dog-reactivity', title: 'Reaktywność', desc: 'emocje i bodźce' },
          { href: '#cennik', icon: 'dog-separation', title: 'Separacja', desc: 'zostawanie samemu' },
          { href: '#cennik', icon: 'dog-puppy', title: 'Szczeniak', desc: 'start i nauka' },
          { href: '#cennik', icon: 'topic-other', title: 'Pozostale', desc: 'inne tematy' },
        ]}
      />
      <PetTopicCard
        href="/zapytaj"
        icon="cat"
        heading="Kot"
        links={[
          { href: '#cennik', icon: 'cat-litter', title: 'Kuweta', desc: 'higiena i nawyki' },
          { href: '#cennik', icon: 'cat-stress', title: 'Stres', desc: 'emocje i zmiany' },
          { href: '#cennik', icon: 'cat-conflict', title: 'Konflikt', desc: 'relacje z innymi' },
          { href: '#cennik', icon: 'cat-other', title: 'Pozostale', desc: 'inne tematy' },
        ]}
      />
    </section>
  )
}
