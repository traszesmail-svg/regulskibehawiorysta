import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { loadEnvConfig } from '@next/env'
import {
  buildExpectedMarker,
  evaluateReleaseSmokeRedirect,
  evaluateReleaseSmokePage,
  getDefaultReleaseSmokeRules,
} from '../lib/release-smoke'
import { SITE_PRODUCTION_URL } from '../lib/site'

type CliOptions = {
  url: string
  expectedBranch: string | null
  expectedCommit: string | null
}

function readArg(name: string): string | null {
  const index = process.argv.indexOf(name)
  if (index === -1) {
    return null
  }

  return process.argv[index + 1] ?? null
}

function readGit(args: string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function getCliOptions(): CliOptions {
  loadEnvConfig(process.cwd())

  const url =
    readArg('--url') ?? process.env.LIVE_SMOKE_URL ?? SITE_PRODUCTION_URL
  const expectedBranch =
    readArg('--expected-branch') ??
    process.env.LIVE_SMOKE_EXPECTED_BRANCH ??
    process.env.VERCEL_GIT_COMMIT_REF ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
    readGit(['rev-parse', '--abbrev-ref', 'HEAD'])
  const expectedCommitSource =
    readArg('--expected-commit') ??
    process.env.LIVE_SMOKE_EXPECTED_COMMIT ??
    process.env.VERCEL_GIT_COMMIT_SHA ??
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
    readGit(['rev-parse', 'HEAD'])

  return {
    url,
    expectedBranch: expectedBranch ? expectedBranch.trim() : null,
    expectedCommit: expectedCommitSource ? expectedCommitSource.trim().slice(0, 7) : null,
  }
}

async function fetchHtml(url: string, redirect: RequestRedirect = 'follow') {
  const response = await fetch(url, {
    cache: 'no-store',
    redirect,
    headers: {
      'cache-control': 'no-cache',
      pragma: 'no-cache',
    },
  })

  const html = await response.text()

  return { response, html }
}

async function main() {
  const options = getCliOptions()
  const baseUrl = options.url.endsWith('/') ? options.url : `${options.url}/`
  const rules = getDefaultReleaseSmokeRules()
  const expectedMarker =
    options.expectedBranch && options.expectedCommit
      ? buildExpectedMarker(options.expectedBranch, options.expectedCommit)
      : null

  console.log(`Smoke URL: ${baseUrl}`)
  if (expectedMarker) {
    console.log(`Expected build marker: ${expectedMarker}`)
  } else {
    console.log('Expected build marker: not set')
  }

  let hasFailures = false

  for (const rule of rules) {
    const url = new URL(rule.path, baseUrl).toString()
    const smokeUrl = `${url}${url.includes('?') ? '&' : '?'}__release_smoke=${Date.now()}`
    const { response, html } = await fetchHtml(
      smokeUrl,
      rule.expectedRedirectTo ? 'manual' : 'follow',
    )

    if (rule.expectedRedirectTo) {
      const redirectResult = evaluateReleaseSmokeRedirect(
        smokeUrl,
        rule,
        response.status,
        response.headers.get('location'),
      )
      assert.equal(redirectResult.ok, true, `Smoke redirect check failed for ${url}: ${redirectResult.issues.join(' | ')}`)
      console.log(`\nURL: ${url}`)
      console.log(`status: redirect ${redirectResult.actualStatus}`)
      console.log(`redirect-target: ${redirectResult.target}`)
      continue
    }

    assert.equal(response.ok, true, `Smoke check failed for ${url}: HTTP ${response.status}`)
    const result = evaluateReleaseSmokePage(html, baseUrl, rule)

    console.log(`\nURL: ${result.url}`)

    if (result.ok) {
      console.log('status: ok')
    } else {
      console.log('status: fail')
      hasFailures = true
    }

    for (const phrase of rule.required ?? []) {
      console.log(`required: "${phrase}"`)
    }

    for (const phrase of rule.forbidden ?? []) {
      console.log(`forbidden: "${phrase}"`)
    }

    if (result.missing.length > 0) {
      console.log(`missing: ${result.missing.join(' | ')}`)
    }

    if (result.forbiddenFound.length > 0) {
      console.log(`forbidden-found: ${result.forbiddenFound.join(' | ')}`)
    }

    if (result.forbiddenRawFound.length > 0) {
      console.log(`forbidden-raw-found: ${result.forbiddenRawFound.join(' | ')}`)
    }

    if (result.orderFailures.length > 0) {
      console.log(`order-failures: ${result.orderFailures.join(' | ')}`)
    }

    if (result.buildMarker) {
      console.log(`build-marker: ${result.buildMarker}`)
    } else if (rule.requireBuildMarker) {
      console.log('build-marker: missing')
    }

    if (expectedMarker && result.buildMarker !== expectedMarker) {
      console.log(`expected-marker-mismatch: expected ${expectedMarker}`)
      hasFailures = true
    }
  }

  if (hasFailures) {
    throw new Error('Live release smoke detected regressions or an outdated deployment.')
  }

  console.log('\nLive release smoke passed.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
