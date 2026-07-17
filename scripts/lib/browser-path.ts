import { access, readdir } from 'node:fs/promises'
import path from 'node:path'

type BrowserExecutableOptions = {
  preferSystem?: boolean
}

async function firstExistingPath(candidates: Array<string | undefined | null>) {
  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }

    try {
      await access(candidate)
      return candidate
    } catch {}
  }

  return null
}

async function getPlaywrightBrowserCandidates() {
  const localAppData = process.env.LOCALAPPDATA?.trim()

  if (!localAppData) {
    return []
  }

  const msPlaywrightRoot = path.join(localAppData, 'ms-playwright')
  const entries = await readdir(msPlaywrightRoot, { withFileTypes: true }).catch(() => [])
  const headlessShellDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith('chromium_headless_shell-'))
    .sort((left, right) => right.localeCompare(left, 'en', { numeric: true }))
  const chromiumDirs = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => name.startsWith('chromium-'))
    .sort((left, right) => right.localeCompare(left, 'en', { numeric: true }))

  const candidates: string[] = []

  for (const versionDir of headlessShellDirs) {
    if (versionDir.startsWith('chromium_headless_shell-')) {
      candidates.push(
        path.join(msPlaywrightRoot, versionDir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
        path.join(msPlaywrightRoot, versionDir, 'chrome-headless-shell-win', 'chrome-headless-shell.exe'),
      )
    }
  }

  for (const versionDir of chromiumDirs) {
    candidates.push(
      path.join(msPlaywrightRoot, versionDir, 'chrome-win64', 'chrome.exe'),
      path.join(msPlaywrightRoot, versionDir, 'chrome-win', 'chrome.exe'),
    )
  }

  return candidates
}

export async function resolveBrowserExecutablePath({ preferSystem = false }: BrowserExecutableOptions = {}) {
  const envPath = await firstExistingPath([
    process.env.BROWSER_EXECUTABLE_PATH?.trim(),
    process.env.CHROME_EXECUTABLE_PATH?.trim(),
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?.trim(),
  ])

  if (envPath) {
    return envPath
  }

  const systemPath = await firstExistingPath([
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ])

  if (preferSystem && systemPath) {
    return systemPath
  }

  const playwrightPath = await firstExistingPath(await getPlaywrightBrowserCandidates())

  if (playwrightPath) {
    return playwrightPath
  }

  if (systemPath) {
    return systemPath
  }

  throw new Error('Nie znaleziono lokalnej przegladarki Chromium (headless shell, Chrome lub Edge).')
}
