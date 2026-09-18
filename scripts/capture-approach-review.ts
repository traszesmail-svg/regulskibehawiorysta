import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'
import { resolveBrowserExecutablePath } from './lib/browser-path'

async function main() {
  const browserPath = await resolveBrowserExecutablePath()
  if (!browserPath) {
    throw new Error('Could not find Chromium/Chrome executable.')
  }

  const outDir = path.join(process.cwd(), 'output', 'home-review')
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

  // Desktop
  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: hideDevBadgeCss })
    await page.waitForTimeout(500)

    // Hero screenshot
    const heroEl = page.locator('.homepage-zapytaj-hero')
    if (await heroEl.count()) {
      await heroEl.screenshot({ path: path.join(outDir, 'hero-desktop-1440.png') })
    }

    // Approach section screenshot
    const approachEl = page.locator('.homepage-approach-section')
    if (await approachEl.count()) {
      await approachEl.screenshot({ path: path.join(outDir, 'approach-desktop-1440.png') })
    }

    // Full desktop
    await page.screenshot({ path: path.join(outDir, 'full-desktop-1440.png'), fullPage: true })

    await context.close()
  }

  // Mobile
  {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    })
    const page = await context.newPage()
    await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' })
    await page.addStyleTag({ content: hideDevBadgeCss })
    await page.waitForTimeout(500)

    // Hero mobile screenshot
    const heroEl = page.locator('.homepage-zapytaj-hero')
    if (await heroEl.count()) {
      await heroEl.screenshot({ path: path.join(outDir, 'hero-mobile-390.png') })
    }

    // Steps mobile
    const stepsEl = page.locator('.homepage-sales-process-grid')
    if (await stepsEl.count()) {
      await stepsEl.screenshot({ path: path.join(outDir, 'steps-mobile-390.png') })
    }

    // Approach mobile screenshot
    const approachEl = page.locator('.homepage-approach-section')
    if (await approachEl.count()) {
      await approachEl.screenshot({ path: path.join(outDir, 'approach-mobile-390.png') })
    }

    // Full mobile
    await page.screenshot({ path: path.join(outDir, 'full-mobile-390.png'), fullPage: true })

    await context.close()
  }

  await browser.close()
  console.log('Screenshots saved successfully to', outDir)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
