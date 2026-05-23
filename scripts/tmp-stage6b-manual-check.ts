import { spawn, type ChildProcess } from 'node:child_process'

const rootDir = process.cwd()
const port = 3411
const appUrl = `http://127.0.0.1:${port}`

const routes = [
  '/',
  '/psy',
  '/koty',
  '/opinie',
  '/o-mnie',
  '/kontakt',
  '/materialy',
  '/cennik',
  '/konsultacja-behawioralna-online',
  '/behawiorysta-psow',
  '/behawiorysta-kotow',
  '/blog',
  '/blog/dlaczego-moj-pies-szczeka-na-inne-psy',
  '/blog/pies-wyje-kiedy-zostaje-sam',
  '/blog/kot-zalatwia-sie-poza-kuweta',
  '/blog/jak-wyglada-konsultacja-behawioralna-online',
  '/psy/lek-separacyjny',
  '/psy/reaktywnosc-na-smyczy',
  '/koty/konflikt-miedzy-kotami',
  '/koty/zalatwianie-poza-kuweta',
] as const

function normalizeHtmlText(input: string) {
  return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function extractH1(html: string) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  return match ? normalizeHtmlText(match[1]) : ''
}

async function waitForServer() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(appUrl, { cache: 'no-store' })
      if (response.status > 0) {
        return
      }
    } catch {}

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error('Stage 6B manual check server did not become ready in time.')
}

async function main() {
  let server: ChildProcess | null = null

  try {
    server = spawn('cmd.exe', ['/c', 'npm', 'run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
      cwd: rootDir,
      env: process.env,
      stdio: 'ignore',
      windowsHide: true,
    })

    await waitForServer()

    for (const route of routes) {
      const response = await fetch(`${appUrl}${route}`, { cache: 'no-store' })
      const html = await response.text()
      const line = {
        route,
        status: response.status,
        h1: extractH1(html),
        primary: html.includes('Zamów 15 min audio - 69 zł'),
        secondary: html.includes('Przejdź do Materialya'),
        consultation: html.includes('Konsultacja online 60 min - 350 zł'),
        contact: html.includes('Napisz krótką wiadomość'),
      }

      console.log(JSON.stringify(line))
    }
  } finally {
    if (server) {
      server.kill()
    }
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error)
  process.exitCode = 1
})
