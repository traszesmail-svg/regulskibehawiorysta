import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

const pages = [
  { name: 'o-mnie', path: '/o-mnie' },
  { name: 'konsultacja', path: '/konsultacja' },
  { name: 'terapia', path: '/terapia' },
  { name: 'materialy', path: '/materialy' },
  { name: 'cennik', path: '/cennik' },
  { name: 'kontakt', path: '/kontakt' },
  { name: 'faq', path: '/faq' },
  { name: 'opinie', path: '/opinie' },
  { name: 'mapa-sprawy', path: '/mapa-sprawy' },
]

async function main() {
  const browserPath = await resolveBrowserExecutablePath()
  if (!browserPath) {
    throw new Error('Could not find Chromium/Chrome executable.')
  }

  const outDir = path.join(process.cwd(), 'output', 'subpages-audit')
  await mkdir(outDir, { recursive: true })

  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
  })

  const hideDevBadgeCss = `
    nextjs-portal, #__next-build-watcher, [data-nextjs-toast], .consent-banner, [data-consent-banner] {
      display: none !important;
    }
  `

  for (const pageItem of pages) {
    // Desktop
    const contextDesktop = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const pageDesktop = await contextDesktop.newPage()
    try {
      await pageDesktop.goto(`http://127.0.0.1:3000${pageItem.path}`, { waitUntil: 'networkidle', timeout: 15000 })
      await pageDesktop.addStyleTag({ content: hideDevBadgeCss })
      await pageDesktop.waitForTimeout(400)
      await pageDesktop.screenshot({ path: path.join(outDir, `${pageItem.name}-desktop.png`) })
    } catch (e) {
      console.error(`Error desktop ${pageItem.name}:`, e)
    } finally {
      await contextDesktop.close()
    }

    // Mobile
    const contextMobile = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    })
    const pageMobile = await contextMobile.newPage()
    try {
      await pageMobile.goto(`http://127.0.0.1:3000${pageItem.path}`, { waitUntil: 'networkidle', timeout: 15000 })
      await pageMobile.addStyleTag({ content: hideDevBadgeCss })
      await pageMobile.waitForTimeout(400)
      await pageMobile.screenshot({ path: path.join(outDir, `${pageItem.name}-mobile.png`) })
    } catch (e) {
      console.error(`Error mobile ${pageItem.name}:`, e)
    } finally {
      await contextMobile.close()
    }
    console.log(`Captured: ${pageItem.name}`)
  }

  await browser.close()
  console.log('Audit screenshots saved to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
