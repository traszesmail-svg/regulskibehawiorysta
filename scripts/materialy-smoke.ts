// Storage-level smoke test for the /materialy funnel.
// Walks through the order/download lifecycle for active recovered materials.
// p49 bundles are intentionally not published.
//
//   npx tsx scripts/materialy-smoke.ts

import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  PRICE_AMOUNT_PLN,
  PRICE_LABEL,
  getMaterialyBundleBySlug,
  getMaterialyGuideBySlug,
  listMaterialyGuides,
  listMaterialyBundles,
} from '../lib/materialy-catalog'
import {
  checkAndUseCode,
  confirmPayment,
  createOrder,
  getOrderById,
} from '../lib/server/materialy-storage'

const DATA_DIR = path.join(process.cwd(), 'data')
const ORDERS_FILE = path.join(DATA_DIR, 'materialy-orders.json')
const PDF_DIR = path.join(process.cwd(), 'content', 'guides', 'pdf')

let testsPassed = 0
let testsFailed = 0

function ok(label: string, cond: boolean, detail?: string) {
  if (cond) {
    testsPassed += 1
    console.log(`  PASS  ${label}${detail ? ` — ${detail}` : ''}`)
  } else {
    testsFailed += 1
    console.error(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`)
  }
}

async function resetStorage() {
  try {
    await fs.unlink(ORDERS_FILE)
  } catch {
    /* ignore */
  }
}

async function smokeFreeGuide() {
  console.log('\n[1] Free lead magnet flow')
  const guide = listMaterialyGuides().find((g) => g.tier === 'free')
  if (!guide) {
    ok('found a free guide', false)
    return
  }
  ok('free guide present in catalog', true, guide.slug)

  const order = await createOrder({
    productKind: 'guide',
    productSlug: guide.slug,
    priceLabel: PRICE_LABEL[guide.priceCode],
    priceAmount: PRICE_AMOUNT_PLN[guide.priceCode],
    customerName: 'Smoke Tester',
    customerEmail: 'smoke-free@example.com',
    customerPhone: null,
    notes: null,
    consents: { processing: true, policy: true },
  })
  ok('free order created', !!order.id)
  ok('free order is paid immediately', order.status === 'paid')
  ok('free order has a code', !!order.code && /^\d{6}$/.test(order.code ?? ''))
  ok('free order has expiresAt', !!order.expiresAt)

  const r1 = await checkAndUseCode('smoke-free@example.com', order.code as string)
  ok('first download accepted', r1.ok === true)

  const r2 = await checkAndUseCode('SMOKE-FREE@example.com', order.code as string)
  ok('case-insensitive email accepted', r2.ok === true)

  const r3 = await checkAndUseCode('smoke-free@example.com', order.code as string)
  ok('third download accepted', r3.ok === true)

  const after = await getOrderById(order.id)
  ok('order marked as used after 3 downloads', after?.status === 'used')

  const r4 = await checkAndUseCode('smoke-free@example.com', order.code as string)
  ok('4th download blocked (limit-reached)', r4.ok === false && r4.reason === 'limit-reached')
}

async function smokePaidGuide() {
  console.log('\n[2] Paid guide flow retired')
  const guide = listMaterialyGuides().find((g) => g.priceCode === 'p19')
  if (!guide) {
    ok('no paid 19 zl guide is active after ODZYSKANE cleanup', true)
    return
  }
  ok('paid guide present in catalog', true, guide.slug)

  const order = await createOrder({
    productKind: 'guide',
    productSlug: guide.slug,
    priceLabel: PRICE_LABEL[guide.priceCode],
    priceAmount: PRICE_AMOUNT_PLN[guide.priceCode],
    customerName: 'Smoke Buyer',
    customerEmail: 'smoke-paid@example.com',
    customerPhone: null,
    notes: 'BLIK incoming',
    consents: { processing: true, policy: true },
  })
  ok('paid order created with status pending', order.status === 'pending')
  ok('pending order has no code yet', order.code === null)

  // Trying to download before payment confirmation should fail.
  const before = await checkAndUseCode('smoke-paid@example.com', '000000')
  ok('download blocked before code is set', before.ok === false)

  const confirmed = await confirmPayment(order.id)
  ok('confirmPayment returns updated order', !!confirmed)
  ok('confirmed order is paid', confirmed?.status === 'paid')
  ok('confirmed order has a code', !!confirmed?.code && /^\d{6}$/.test(confirmed?.code ?? ''))

  // Idempotent confirm: calling again should keep the same code.
  const second = await confirmPayment(order.id)
  // After first confirm status is 'paid' so confirm-again returns null path,
  // but our endpoint handles that. Here we just check code stability via getOrderById.
  const refetch = await getOrderById(order.id)
  ok('code is stable after second confirmPayment attempt', refetch?.code === confirmed?.code)
  void second // unused

  const dl = await checkAndUseCode('smoke-paid@example.com', confirmed?.code as string)
  ok('download accepted with correct code', dl.ok === true)

  const wrong = await checkAndUseCode('smoke-paid@example.com', '111111')
  ok('wrong code rejected', wrong.ok === false && wrong.reason === 'wrong-code')
}

async function smokeBundle() {
  console.log('\n[3] Bundle flow retired')
  const bundle = listMaterialyBundles()[0]
  if (!bundle) {
    ok('no bundle is active while p49 is excluded', true)
    return
  }
  ok('bundle present in catalog', true, bundle.slug)
  ok('bundle has 3 guides', bundle.guideSlugs.length === 3)

  // Verify each referenced guide PDF exists on disk.
  for (const slug of bundle.guideSlugs) {
    const g = getMaterialyGuideBySlug(slug)
    ok(`bundle guide '${slug}' exists in catalog`, !!g)
    if (!g) continue
    const filePath = path.join(PDF_DIR, g.pdfFile)
    let exists = false
    try {
      await fs.access(filePath)
      exists = true
    } catch {
      /* ignore */
    }
    ok(`PDF file exists: ${g.pdfFile}`, exists, filePath)
  }

  const order = await createOrder({
    productKind: 'bundle',
    productSlug: bundle.slug,
    priceLabel: PRICE_LABEL[bundle.priceCode],
    priceAmount: PRICE_AMOUNT_PLN[bundle.priceCode],
    customerName: 'Smoke Bundle',
    customerEmail: 'smoke-bundle@example.com',
    customerPhone: null,
    notes: null,
    consents: { processing: true, policy: true },
  })
  ok('bundle order created with status pending', order.status === 'pending')
  ok('bundle order priceLabel = 49 zł', order.priceLabel === '49 zł')

  const confirmed = await confirmPayment(order.id)
  const dl = await checkAndUseCode('smoke-bundle@example.com', confirmed?.code as string)
  ok('bundle download accepted', dl.ok === true)
}

async function smokeCatalogIntegrity() {
  console.log('\n[4] Catalog integrity')
  const guides = listMaterialyGuides()
  const bundles = listMaterialyBundles()

  // Every guide PDF must exist on disk.
  for (const g of guides) {
    const filePath = path.join(PDF_DIR, g.pdfFile)
    let exists = false
    try {
      await fs.access(filePath)
      exists = true
    } catch {
      /* ignore */
    }
    ok(`PDF exists: ${g.pdfFile}`, exists)
  }

  // Every bundle slug must reference real guides.
  for (const b of bundles) {
    for (const slug of b.guideSlugs) {
      const g = getMaterialyGuideBySlug(slug)
      ok(`bundle ${b.slug} references valid guide ${slug}`, !!g)
    }
  }

  // Bundles must always be cheaper than the sum of their parts (avoids
  // confusion where a bundle is more expensive than buying separately).
  for (const b of bundles) {
    const sum = b.guideSlugs
      .map((slug) => getMaterialyGuideBySlug(slug))
      .filter((g): g is NonNullable<ReturnType<typeof getMaterialyGuideBySlug>> => g !== null)
      .reduce((acc, g) => acc + PRICE_AMOUNT_PLN[g.priceCode], 0)
    ok(
      `bundle ${b.slug} is cheaper than sum of parts`,
      sum > PRICE_AMOUNT_PLN[b.priceCode],
      `parts=${sum} zł, bundle=${PRICE_AMOUNT_PLN[b.priceCode]} zł`,
    )
  }
}

async function main() {
  console.log('Resetting storage...')
  await resetStorage()

  await smokeCatalogIntegrity()
  await smokeFreeGuide()
  await smokePaidGuide()
  await smokeBundle()

  console.log(`\nResults: ${testsPassed} passed, ${testsFailed} failed`)
  if (testsFailed > 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
