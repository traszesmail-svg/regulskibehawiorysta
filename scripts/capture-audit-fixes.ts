import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const BASE_URL = 'http://127.0.0.1:3000'
const OUT_DIR = path.join(process.cwd(), 'output', 'audit-fixes')

const hideDevBadgeCss = `
  nextjs-portal, #__next-build-watcher, [data-nextjs-toast], .consent-banner, [data-consent-banner] {
    display: none !important;
  }
`

async function main() {
  const browserPath = await resolveBrowserExecutablePath()
  if (!browserPath) throw new Error('Could not find Chromium/Chrome executable.')

  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })

  // 1. Kontakt mobile 390x844 (Full page)
  const ctxKontaktMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageKontaktMobile = await ctxKontaktMobile.newPage()
  await pageKontaktMobile.goto(`${BASE_URL}/kontakt`, { waitUntil: 'networkidle' })
  await pageKontaktMobile.addStyleTag({ content: hideDevBadgeCss })
  await pageKontaktMobile.waitForTimeout(400)
  await pageKontaktMobile.screenshot({
    path: path.join(OUT_DIR, 'kontakt-mobile-390-full.png'),
    fullPage: true,
  })

  // Kontakt mobile bottom trust card
  const trustCardMobile = pageKontaktMobile.locator('.contact-trust-card')
  await trustCardMobile.scrollIntoViewIfNeeded()
  await pageKontaktMobile.waitForTimeout(300)
  await pageKontaktMobile.screenshot({
    path: path.join(OUT_DIR, 'kontakt-mobile-390-trust-card.png'),
  })
  await ctxKontaktMobile.close()

  // 2. Kontakt desktop 1440x900 (Full page)
  const ctxKontaktDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const pageKontaktDesktop = await ctxKontaktDesktop.newPage()
  await pageKontaktDesktop.goto(`${BASE_URL}/kontakt`, { waitUntil: 'networkidle' })
  await pageKontaktDesktop.addStyleTag({ content: hideDevBadgeCss })
  await pageKontaktDesktop.waitForTimeout(400)
  await pageKontaktDesktop.screenshot({
    path: path.join(OUT_DIR, 'kontakt-desktop-1440-full.png'),
    fullPage: true,
  })

  // Kontakt desktop trust card view
  const trustCardDesktop = pageKontaktDesktop.locator('.contact-trust-card')
  await trustCardDesktop.scrollIntoViewIfNeeded()
  await pageKontaktDesktop.waitForTimeout(300)
  await pageKontaktDesktop.screenshot({
    path: path.join(OUT_DIR, 'kontakt-desktop-1440-trust-card.png'),
  })
  await ctxKontaktDesktop.close()

  // 3. Homepage middle section (3 steps + new approach card) on desktop 1440x900
  const ctxHomeDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const pageHomeDesktop = await ctxHomeDesktop.newPage()
  await pageHomeDesktop.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await pageHomeDesktop.addStyleTag({ content: hideDevBadgeCss })
  await pageHomeDesktop.waitForSelector('.homepage-approach-card', { timeout: 10000 })
  await pageHomeDesktop.waitForTimeout(400)

  // Scroll to process and approach section
  const approachCardDesktop = pageHomeDesktop.locator('.homepage-approach-card')
  await approachCardDesktop.scrollIntoViewIfNeeded()
  await pageHomeDesktop.waitForTimeout(300)
  await pageHomeDesktop.screenshot({
    path: path.join(OUT_DIR, 'home-desktop-approach-card.png'),
  })
  await ctxHomeDesktop.close()

  // 4. Homepage middle section on mobile 390x844
  const ctxHomeMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageHomeMobile = await ctxHomeMobile.newPage()
  await pageHomeMobile.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await pageHomeMobile.addStyleTag({ content: hideDevBadgeCss })
  await pageHomeMobile.waitForSelector('.homepage-approach-card', { timeout: 10000 })
  await pageHomeMobile.waitForTimeout(400)

  // Scroll to process + approach
  const approachCardMobile = pageHomeMobile.locator('.homepage-approach-card')
  await approachCardMobile.scrollIntoViewIfNeeded()
  await pageHomeMobile.waitForTimeout(300)
  await pageHomeMobile.screenshot({
    path: path.join(OUT_DIR, 'home-mobile-390-approach-card.png'),
  })

  // Full homepage mobile
  await pageHomeMobile.screenshot({
    path: path.join(OUT_DIR, 'home-mobile-390-full.png'),
    fullPage: true,
  })
  await ctxHomeMobile.close()

  await browser.close()
  console.log('Screenshots generated in:', OUT_DIR)

  // Copy to Desktop archives
  const desktopZip1 = path.join('C:', 'Users', 'chris', 'Desktop', 'zrzuty-strony-chatgpt.zip')
  const desktopZip2 = path.join('C:', 'Users', 'chris', 'Desktop', 'screenshoty-regulski-2026-09-18.zip')

  const filesPattern = path.join(OUT_DIR, '*').replace(/\\/g, '\\\\')
  execSync(`powershell -Command "Compress-Archive -Path '${filesPattern}' -DestinationPath '${desktopZip1.replace(/\\/g, '\\\\')}' -Update"`)
  console.log('Updated:', desktopZip1)

  execSync(`powershell -Command "Compress-Archive -Path '${filesPattern}' -DestinationPath '${desktopZip2.replace(/\\/g, '\\\\')}' -Update"`)
  console.log('Updated:', desktopZip2)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
