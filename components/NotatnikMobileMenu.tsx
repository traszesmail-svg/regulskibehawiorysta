'use client'

import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import Link from 'next/link'

type NotatnikMobileMenuItem = {
  href: string
  label: string
}

type NotatnikMobileMenuProps = {
  navItems: readonly NotatnikMobileMenuItem[]
  ctaHref?: string
  ctaLabel?: string
}

const MOBILE_MENU_AUTO_CLOSE_DELAY_MS = 8000
const MOBILE_MENU_LINK_CLOSE_DELAY_MS = 160

export function NotatnikMobileMenuAutoClose() {
  useEffect(() => {
    let autoCloseTimer: ReturnType<typeof window.setTimeout> | null = null

    const getOpenMenus = () => Array.from(document.querySelectorAll<HTMLDetailsElement>('.notatnik-mobile-menu[open]'))

    const clearAutoCloseTimer = () => {
      if (autoCloseTimer) {
        window.clearTimeout(autoCloseTimer)
        autoCloseTimer = null
      }
    }

    const closeOpenMenus = () => {
      clearAutoCloseTimer()
      getOpenMenus().forEach((details) => {
        details.open = false
      })
    }

    const scheduleAutoClose = () => {
      clearAutoCloseTimer()

      if (getOpenMenus().length > 0) {
        autoCloseTimer = window.setTimeout(closeOpenMenus, MOBILE_MENU_AUTO_CLOSE_DELAY_MS)
      }
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Element)) {
        return
      }

      if (target.closest('.notatnik-mobile-menu a')) {
        window.setTimeout(closeOpenMenus, MOBILE_MENU_LINK_CLOSE_DELAY_MS)
        return
      }

      if (target.closest('.notatnik-mobile-menu')) {
        window.setTimeout(scheduleAutoClose, 0)
        return
      }

      if (getOpenMenus().length > 0) {
        closeOpenMenus()
      }
    }

    const onMenuToggle = (event: Event) => {
      const target = event.target

      if (!(target instanceof HTMLDetailsElement) || !target.classList.contains('notatnik-mobile-menu')) {
        return
      }

      if (target.open) {
        scheduleAutoClose()
      } else if (getOpenMenus().length === 0) {
        clearAutoCloseTimer()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOpenMenus()
        return
      }

      const target = event.target

      if ((event.key === 'Enter' || event.key === ' ') && target instanceof Element && target.closest('.notatnik-mobile-menu summary')) {
        window.setTimeout(scheduleAutoClose, 0)
      }
    }

    document.addEventListener('toggle', onMenuToggle, true)
    window.addEventListener('click', onDocumentClick)
    window.addEventListener('scroll', closeOpenMenus, { passive: true })
    window.addEventListener('wheel', closeOpenMenus, { passive: true })
    window.addEventListener('touchmove', closeOpenMenus, { passive: true })
    window.addEventListener('resize', closeOpenMenus)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      clearAutoCloseTimer()
      document.removeEventListener('toggle', onMenuToggle, true)
      window.removeEventListener('click', onDocumentClick)
      window.removeEventListener('scroll', closeOpenMenus)
      window.removeEventListener('wheel', closeOpenMenus)
      window.removeEventListener('touchmove', closeOpenMenus)
      window.removeEventListener('resize', closeOpenMenus)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return null
}

export function NotatnikMobileMenu({ navItems, ctaHref = '/quiz', ctaLabel = 'Quiz' }: NotatnikMobileMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const autoCloseTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      window.clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }
  }, [])

  const closeMenu = useCallback(() => {
    const details = detailsRef.current

    clearAutoCloseTimer()

    if (details?.open) {
      details.open = false
    }
  }, [clearAutoCloseTimer])

  const scheduleAutoClose = useCallback(() => {
    clearAutoCloseTimer()

    if (detailsRef.current?.open) {
      autoCloseTimerRef.current = window.setTimeout(closeMenu, MOBILE_MENU_AUTO_CLOSE_DELAY_MS)
    }
  }, [clearAutoCloseTimer, closeMenu])

  const handleInternalLinkClick = useCallback(
    (href: string) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return
      }

      event.preventDefault()
      closeMenu()
      window.location.assign(href)
    },
    [closeMenu],
  )

  useEffect(() => {
    const details = detailsRef.current

    const onToggle = () => {
      if (details?.open) {
        scheduleAutoClose()
      } else {
        clearAutoCloseTimer()
      }
    }

    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target

      if (!(target instanceof Element) || !detailsRef.current?.open) {
        return
      }

      if (!target.closest('.notatnik-mobile-menu')) {
        closeMenu()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu()
      }
    }

    details?.addEventListener('toggle', onToggle)
    window.addEventListener('click', onDocumentClick)
    window.addEventListener('scroll', closeMenu, { passive: true })
    window.addEventListener('wheel', closeMenu, { passive: true })
    window.addEventListener('touchmove', closeMenu, { passive: true })
    window.addEventListener('resize', closeMenu)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      clearAutoCloseTimer()
      details?.removeEventListener('toggle', onToggle)
      window.removeEventListener('click', onDocumentClick)
      window.removeEventListener('scroll', closeMenu)
      window.removeEventListener('wheel', closeMenu)
      window.removeEventListener('touchmove', closeMenu)
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [clearAutoCloseTimer, closeMenu, scheduleAutoClose])

  return (
    <details ref={detailsRef} className="notatnik-mobile-menu">
      <summary aria-label="Otwórz menu">
        <span className="notatnik-mobile-menu-bars" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </summary>
      <div className="notatnik-mobile-menu-panel">
        <nav aria-label="Menu mobilne">
          <Link href={ctaHref} prefetch={false} className="notatnik-mobile-menu-cta" onClick={handleInternalLinkClick(ctaHref)}>
            {ctaLabel}
          </Link>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} prefetch={false} onClick={handleInternalLinkClick(item.href)}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </details>
  )
}
