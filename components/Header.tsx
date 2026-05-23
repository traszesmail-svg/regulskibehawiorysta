'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { INSTAGRAM_PROFILE_URL, SITE_HEADER_BRAND, SITE_HEADER_SUBTITLE, SITE_NAME } from '@/lib/site'

// Legacy header kept only for older marketing layouts and special/internal flows.
type NavItem = {
  href: string
  label: string
  sectionId?: string
  activeSectionIds?: string[]
}

const homeNavItems: NavItem[] = [
  { href: '/#start', label: 'Start', sectionId: 'start' },
  { href: '/#opinie', label: 'Opinie', sectionId: 'opinie' },
  { href: '/#faq', label: 'FAQ', sectionId: 'faq' },
]

const dogNavItems: NavItem[] = [
  { href: '/psy#jak-pomagam', label: 'Jak pomagam', sectionId: 'jak-pomagam' },
  { href: '/psy#konsultacja', label: 'Konsultacja', sectionId: 'konsultacja' },
  { href: '/psy#opinie', label: 'Opinie', sectionId: 'opinie' },
  { href: '/psy#faq', label: 'FAQ', sectionId: 'faq' },
]

const catNavItems: NavItem[] = [
  { href: '/koty#jak-pomagam', label: 'Jak pomagam', sectionId: 'jak-pomagam' },
  { href: '/koty#konsultacja', label: 'Konsultacja', sectionId: 'konsultacja' },
  { href: '/koty#opinie', label: 'Opinie', sectionId: 'opinie' },
  { href: '/koty#faq', label: 'FAQ', sectionId: 'faq' },
]

const opinionNavItems: NavItem[] = [
  { href: '/opinie#opinie', label: 'Opinie', sectionId: 'opinie' },
  { href: '/opinie#przypadki', label: 'Przypadki', sectionId: 'przypadki' },
  { href: '/opinie#faq', label: 'FAQ', sectionId: 'faq' },
  { href: '/opinie#kontakt', label: 'Kontakt', sectionId: 'kontakt' },
]

const contactNavItems: NavItem[] = [
  { href: '/kontakt#formularz', label: 'Formularz', sectionId: 'formularz' },
  { href: '/kontakt#faq', label: 'FAQ', sectionId: 'faq' },
]

const materialNavItems: NavItem[] = [
  { href: '/materialy#start', label: 'Start', sectionId: 'start' },
  { href: '/materialy#psy', label: 'Psy', sectionId: 'psy' },
  { href: '/materialy#koty', label: 'Koty', sectionId: 'koty' },
  { href: '/materialy#jak-to-dziala', label: 'Jak to działa', sectionId: 'jak-to-dziala' },
]

const faqNavItems: NavItem[] = [
  { href: '/konsultacja-behawioralna-online#faq', label: 'Konsultacja' },
  { href: '/o-mnie#faq', label: 'Podejście' },
  { href: '/faq#kontakt', label: 'Kontakt', sectionId: 'kontakt' },
]

const aboutNavItems: NavItem[] = [
  { href: '/o-mnie#kim-jestem', label: 'Kim jestem', sectionId: 'kim-jestem' },
  { href: '/o-mnie#metodyka', label: 'Metodyka', sectionId: 'metodyka' },
  { href: '/cennik', label: 'Cennik' },
  { href: '/o-mnie#opinie', label: 'Opinie', sectionId: 'opinie' },
  { href: '/o-mnie#faq', label: 'FAQ', sectionId: 'faq' },
]

const blogNavItems: NavItem[] = [
  { href: '/blog', label: 'Blog' },
]

function getNavItems(pathname: string): NavItem[] {
  if (pathname === '/blog' || pathname.startsWith('/blog/')) return blogNavItems
  if (pathname === '/psy') return dogNavItems
  if (pathname === '/koty') return catNavItems
  if (pathname === '/opinie') return opinionNavItems
  if (pathname === '/o-mnie') return aboutNavItems
  if (pathname === '/kontakt') return contactNavItems
  if (pathname === '/materialy' || pathname === '/przybornik') return materialNavItems
  if (pathname === '/faq') return faqNavItems
  return homeNavItems
}

function buildSectionHref(pathname: string, sectionId: string): string {
  if (
    pathname === '/psy' ||
    pathname === '/koty' ||
    pathname === '/opinie' ||
    pathname === '/o-mnie' ||
    pathname === '/faq' ||
    pathname === '/kontakt' ||
    pathname === '/materialy' ||
    pathname === '/przybornik'
  ) {
    return `${pathname}#${sectionId}`
  }

  return `/#${sectionId}`
}

function InstagramGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5.25" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.1" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function Header() {
  const pathname = usePathname() ?? '/'
  const isHome = pathname === '/'
  const navItems = getNavItems(pathname)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState<string>(navItems[0]?.sectionId ?? '')

  useEffect(() => {
    setMenuOpen(false)

    const sectionIds = navItems
      .map((item) => item.sectionId)
      .filter((sectionId): sectionId is string => Boolean(sectionId))

    if (sectionIds.length === 0) {
      setActiveSection('')
      return
    }

    const hash = window.location.hash.replace(/^#/, '')
    const validSectionIds = new Set(sectionIds)
    setActiveSection(validSectionIds.has(hash) ? hash : sectionIds[0])

    const sections = sectionIds
      .map((sectionId) => document.getElementById(sectionId))
      .filter((section): section is HTMLElement => Boolean(section))

    if (sections.length === 0) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting)
        const topEntry = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        const sectionId = topEntry?.target instanceof HTMLElement ? topEntry.target.id : null

        if (sectionId) {
          setActiveSection(sectionId)
        }
      },
      {
        rootMargin: '-28% 0px -55% 0px',
        threshold: [0.18, 0.32, 0.48, 0.64],
      },
    )

    for (const section of sections) {
      observer.observe(section)
    }

    return () => {
      observer.disconnect()
    }
  }, [navItems, pathname])

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 18)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  useEffect(() => {
    if (!menuOpen) {
      return
    }

    const closeMenu = () => {
      setMenuOpen(false)
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    window.addEventListener('scroll', closeMenu, { passive: true })
    window.addEventListener('wheel', closeMenu, { passive: true })
    window.addEventListener('touchmove', closeMenu, { passive: true })
    window.addEventListener('resize', closeMenu)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('scroll', closeMenu)
      window.removeEventListener('wheel', closeMenu)
      window.removeEventListener('touchmove', closeMenu)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const activeHref = activeSection ? buildSectionHref(pathname, activeSection) : pathname

  function getLinkState(item: NavItem) {
    if ((pathname === '/blog' || pathname.startsWith('/blog/')) && item.href === '/blog') {
      return true
    }

    if (item.activeSectionIds?.includes(activeSection)) {
      return true
    }

    return activeHref === item.href
  }

  function handleNavClick() {
    setMenuOpen(false)
  }

  const headerClassName = `${isHome ? 'premium-home-header header-shell' : 'header-shell'}${isScrolled ? ' is-scrolled' : ''}`
  const headerMainClassName = `${isHome ? 'premium-home-header-inner header-main' : 'header-main'}${isScrolled ? ' is-scrolled' : ''}`
  const brandClassName = isHome ? 'premium-home-brand header-branding' : 'header-branding'
  const navClassName = isHome ? 'premium-home-nav header-nav' : 'header-nav'

  return (
    <header className={headerClassName}>
      <div className={headerMainClassName}>
        <Link href="/" prefetch={false} className={brandClassName} aria-label={SITE_NAME}>
          <span className="brand-copy">
            <span className="brand">{SITE_HEADER_BRAND}</span>
            <span className="header-subtitle">{SITE_HEADER_SUBTITLE}</span>
          </span>
        </Link>

        <nav className={navClassName} aria-label="Główna nawigacja">
          <div className="header-links">
            {navItems.map((item) => {
              const isActive = getLinkState(item)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`header-link${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="header-actions">
          <a
            href={INSTAGRAM_PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="header-social-link"
            aria-label="Otwórz Instagram"
          >
            <InstagramGlyph />
          </a>

          <button
            type="button"
            className="header-menu-toggle"
            aria-expanded={menuOpen}
            aria-controls="site-mobile-menu"
            aria-label={menuOpen ? 'Zamknij menu' : 'Otwórz menu'}
            onClick={() => setMenuOpen((current) => !current)}
          >
            <span className="header-menu-bars" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="header-mobile-panel" id="site-mobile-menu">
          <nav className="header-mobile-links" aria-label="Menu mobilne">
            {navItems.map((item) => {
              const isActive = getLinkState(item)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`header-mobile-link${isActive ? ' is-active' : ''}`}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={handleNavClick}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      ) : null}
    </header>
  )
}
