import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const BASE_URL = 'http://127.0.0.1:3000'
const OUT_DIR = path.join(process.cwd(), 'output', 'subpages-final')

const hideDevBadgeCss = `
  nextjs-portal, #__next-build-watcher, [data-nextjs-toast], .consent-banner, [data-consent-banner] {
    display: none !important;
  }
`

const pagesToCapture = [
  { name: 'kontakt', path: '/kontakt' },
  { name: 'zapytaj', path: '/zapytaj' },
  { name: 'faq', path: '/faq' },
  { name: 'terapia', path: '/terapia' },
  { name: 'o-mnie', path: '/o-mnie' },
  { name: 'konsultacja', path: '/konsultacja' },
  { name: 'materialy', path: '/materialy' },
]

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

  for (const pageItem of pagesToCapture) {
    // Desktop 1440
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const pageDesktop = await contextDesktop.newPage()
    try {
      await pageDesktop.goto(`${BASE_URL}${pageItem.path}`, { waitUntil: 'networkidle', timeout: 20000 })
      await pageDesktop.addStyleTag({ content: hideDevBadgeCss })
      await pageDesktop.waitForTimeout(500)
      
      // Full page screenshot
      await pageDesktop.screenshot({ path: path.join(OUT_DIR, `${pageItem.name}-desktop-1440.png`), fullPage: true })
      // Viewport hero screenshot
      await pageDesktop.screenshot({ path: path.join(OUT_DIR, `${pageItem.name}-desktop-hero-1440.png`) })
    } catch (e) {
      console.error(`Error desktop ${pageItem.name}:`, e)
    } finally {
      await contextDesktop.close()
    }

    // Mobile 390
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    })
    const pageMobile = await contextMobile.newPage()
    try {
      await pageMobile.goto(`${BASE_URL}${pageItem.path}`, { waitUntil: 'networkidle', timeout: 20000 })
      await pageMobile.addStyleTag({ content: hideDevBadgeCss })
      await pageMobile.waitForTimeout(500)

      // Full page screenshot
      await pageMobile.screenshot({ path: path.join(OUT_DIR, `${pageItem.name}-mobile-390.png`), fullPage: true })
      // Viewport hero screenshot
      await pageMobile.screenshot({ path: path.join(OUT_DIR, `${pageItem.name}-mobile-hero-390.png`) })
    } catch (e) {
      console.error(`Error mobile ${pageItem.name}:`, e)
    } finally {
      await contextMobile.close()
    }

    console.log(`Captured: ${pageItem.name}`)
  }

  await browser.close()
  console.log('All screenshots captured to:', OUT_DIR)

  // Package to Desktop ZIPs using PowerShell Compress-Archive
  const desktopZip1 = path.join('C:', 'Users', 'chris', 'Desktop', 'zrzuty-strony-chatgpt.zip')
  const desktopZip2 = path.join('C:', 'Users', 'chris', 'Desktop', 'screenshoty-regulski-2026-09-18.zip')

  const filesPattern = path.join(OUT_DIR, '*').replace(/\\/g, '\\\\')
  
  execSync(`powershell -Command "Compress-Archive -Path '${filesPattern}' -DestinationPath '${desktopZip1.replace(/\\/g, '\\\\')}' -Force"`)
  console.log('Created:', desktopZip1)

  execSync(`powershell -Command "Compress-Archive -Path '${filesPattern}' -DestinationPath '${desktopZip2.replace(/\\/g, '\\\\')}' -Force"`)
  console.log('Created:', desktopZip2)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
