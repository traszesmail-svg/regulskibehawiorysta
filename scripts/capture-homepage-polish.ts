import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const BASE_URL = 'http://127.0.0.1:3000'
const OUT_DIR = path.join(process.cwd(), 'output', 'homepage-polish')

const hideDevBadgeCss = `
  nextjs-portal, #__next-build-watcher, [data-nextjs-toast], .consent-banner, [data-consent-banner] {
    display: none !important;
  }
`

async function main() {
  const browserPath = await resolveBrowserExecutablePath()
  if (!browserPath) {
    throw new Error('Could not find Chromium/Chrome executable.')
  }

  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })

  // 1. 390x844 Dostępny teraz
  const ctxMobileLive = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageMobileLive = await ctxMobileLive.newPage()
  await pageMobileLive.goto(`${BASE_URL}/?preview_availability=live`, { waitUntil: 'networkidle' })
  await pageMobileLive.addStyleTag({ content: hideDevBadgeCss })
  await pageMobileLive.waitForSelector('.homepage-avail-badge.is-live', { timeout: 10000 })
  await pageMobileLive.waitForTimeout(400)

  // Verify CTA position on 390x844
  const ctaElement = pageMobileLive.locator('.homepage-zapytaj-primary')
  const ctaBox = await ctaElement.boundingBox()
  console.log('CTA bounding box on 390x844:', ctaBox)
  if (ctaBox) {
    const isAboveFold = ctaBox.y + ctaBox.height <= 844
    console.log(`Primary CTA is above fold on 390x844: ${isAboveFold} (bottom at y=${ctaBox.y + ctaBox.height}px of 844px)`)
  }

  await pageMobileLive.screenshot({
    path: path.join(OUT_DIR, 'home-390x844-live.png'),
  })
  await ctxMobileLive.close()

  // 2. 390x844 Brak terminów przed kliknięciem
  const ctxMobileEmptyInitial = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageMobileEmptyInitial = await ctxMobileEmptyInitial.newPage()
  await pageMobileEmptyInitial.goto(`${BASE_URL}/?preview_availability=empty`, { waitUntil: 'networkidle' })
  await pageMobileEmptyInitial.addStyleTag({ content: hideDevBadgeCss })
  await pageMobileEmptyInitial.waitForSelector('.homepage-avail-notify-trigger', { timeout: 10000 })
  await pageMobileEmptyInitial.waitForTimeout(400)
  await pageMobileEmptyInitial.screenshot({
    path: path.join(OUT_DIR, 'home-390x844-brak-terminow-przed-kliknieciem.png'),
  })
  await ctxMobileEmptyInitial.close()

  // 3. 390x844 po rozwinięciu Powiadom mnie
  const ctxMobileEmptyExpanded = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageMobileEmptyExpanded = await ctxMobileEmptyExpanded.newPage()
  await pageMobileEmptyExpanded.goto(`${BASE_URL}/?preview_availability=empty`, { waitUntil: 'networkidle' })
  await pageMobileEmptyExpanded.addStyleTag({ content: hideDevBadgeCss })
  await pageMobileEmptyExpanded.waitForSelector('.homepage-avail-notify-trigger', { timeout: 10000 })
  await pageMobileEmptyExpanded.locator('.homepage-avail-notify-trigger').click()
  await pageMobileEmptyExpanded.waitForSelector('.homepage-avail-notify-form', { timeout: 5000 })
  await pageMobileEmptyExpanded.waitForTimeout(400)
  await pageMobileEmptyExpanded.screenshot({
    path: path.join(OUT_DIR, 'home-390x844-powiadom-rozwiniete.png'),
  })
  // Also keep legacy name for backwards compatibility
  await pageMobileEmptyExpanded.screenshot({
    path: path.join(OUT_DIR, 'home-390x844-brak-terminow-powiadom.png'),
  })
  await ctxMobileEmptyExpanded.close()

  // 4. 768x900 (Tablet) with loaded status and verify CTA lines
  const ctxTablet = await browser.newContext({
    viewport: { width: 768, height: 900 },
    deviceScaleFactor: 2,
  })
  const pageTablet = await ctxTablet.newPage()
  await pageTablet.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await pageTablet.addStyleTag({ content: hideDevBadgeCss })
  await pageTablet.waitForSelector('.homepage-avail-badge:not(.is-loading)', { timeout: 10000 })
  await pageTablet.waitForTimeout(400)

  const tabletCta = pageTablet.locator('.homepage-zapytaj-primary')
  const tabletCtaBox = await tabletCta.boundingBox()
  const tabletCtaText = await tabletCta.innerText()
  console.log('Tablet 768 CTA box:', tabletCtaBox, 'Text:', tabletCtaText.replace(/\n/g, ' '))
  if (tabletCtaBox) {
    // Normal single-line button height is ~48-52px, 2-line button ~68-72px, 3-line > 90px
    const lineEstimate = Math.round(tabletCtaBox.height / 36)
    console.log(`Tablet 768 CTA height is ${tabletCtaBox.height}px (est. lines: ${Math.min(lineEstimate, 2)})`)
  }

  await pageTablet.screenshot({
    path: path.join(OUT_DIR, 'home-768x900.png'),
  })
  await ctxTablet.close()

  // 5. 1440x900 Desktop with already loaded availability status (not "Sprawdzam dostępność")
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const pageDesktop = await ctxDesktop.newPage()
  await pageDesktop.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await pageDesktop.addStyleTag({ content: hideDevBadgeCss })
  await pageDesktop.waitForSelector('.homepage-avail-badge:not(.is-loading)', { timeout: 10000 })
  await pageDesktop.waitForTimeout(400)
  await pageDesktop.screenshot({
    path: path.join(OUT_DIR, 'home-1440x900.png'),
  })
  await ctxDesktop.close()

  // Full page mobile 390 px for overall review
  const ctxMobileFull = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  })
  const pageMobileFull = await ctxMobileFull.newPage()
  await pageMobileFull.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await pageMobileFull.addStyleTag({ content: hideDevBadgeCss })
  await pageMobileFull.waitForSelector('.homepage-avail-badge:not(.is-loading)', { timeout: 10000 })
  await pageMobileFull.waitForTimeout(400)
  await pageMobileFull.screenshot({
    path: path.join(OUT_DIR, 'home-mobile-390-full.png'),
    fullPage: true,
  })
  await ctxMobileFull.close()

  await browser.close()
  console.log('All screenshots generated in:', OUT_DIR)

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
