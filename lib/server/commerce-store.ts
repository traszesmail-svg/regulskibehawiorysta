import { randomBytes, randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import {
  type CommerceAccessStatus,
  type CommerceCreateOrderInput,
  type CommerceOrder,
  type CommerceOrderStatus,
  type CommercePaymentMethod,
  getManualAmountForProduct,
  normalizeCommerceEmail,
} from '@/lib/commerce'
import { getLocalStoreDataDir } from '@/lib/server/local-store-path'

type LeadBookingCommerceMeta = {
  commerce: true
  status: CommerceOrderStatus
  productType: CommerceOrder['productType']
  productId: string
  amount: number
  onlineAmount: number
  manualAmount: number
  currency: 'PLN'
  customerPhone: string | null
  accessCodeStatus: CommerceAccessStatus | null
  accessCodeUsageCount: number
  accessCodeUsageLimit: number
  accessCodeExpiresAt: string | null
  adminConfirmationTokenUsedAt: string | null
  adminConfirmationIp: string | null
  adminConfirmationUserAgent: string | null
  stripeCheckoutSessionId: string | null
  providerPaymentId: string | null
  paidAt: string | null
  accessSentAt: string | null
  paymentReportedAt: string | null
  cancelledAt: string | null
  meta: CommerceOrder['meta']
}

type LeadBookingRow = {
  id: string
  access_token: string
  created_at: string
  updated_at: string
  status: string
  service: string
  service_label: string
  service_price: string
  name: string
  email: string
  species: string
  description: string
  preferred_slots: string
  confirmed_date: string | null
  confirmed_time: string | null
  payment_link: string | null
  payment_method: string | null
  paid_at: string | null
  call_room_url: string | null
  calendar_url: string | null
  admin_notes: string | null
}

type CommerceStoreShape = {
  orders: CommerceOrder[]
}

const STORE_FILE = 'payment-orders.json'
const CONFIRM_TOKEN_PREFIX = 'commerce-confirm:'
const ACCESS_CODE_PREFIX = 'commerce-code:'

function nowIso() {
  return new Date().toISOString()
}

function makeOrderNumber() {
  return `ZAM-${randomBytes(4).toString('hex').toUpperCase().slice(0, 6)}`
}

function makeConfirmationToken() {
  return randomBytes(32).toString('base64url')
}

function makeAccessCode() {
  const left = randomBytes(2).toString('hex').toUpperCase().slice(0, 4)
  const right = randomBytes(2).toString('hex').toUpperCase().slice(0, 2)
  return `KOD-${left}-${right}`
}

function getAccessUsageLimit(productType: CommerceOrder['productType']) {
  return productType === 'ebook' ? 3 : 20
}

function getAccessExpiry(productType: CommerceOrder['productType']) {
  const hours = productType === 'ebook' ? 72 : 24 * 30
  return new Date(Date.now() + hours * 3600 * 1000).toISOString()
}

function usesAccessCode(order: Pick<CommerceOrder, 'productType'>) {
  return order.productType === 'ebook'
}

function getStorePath() {
  return path.join(getLocalStoreDataDir(), STORE_FILE)
}

async function readLocalStore(): Promise<CommerceStoreShape> {
  try {
    const raw = await readFile(getStorePath(), 'utf8')
    const parsed = JSON.parse(raw) as Partial<CommerceStoreShape>
    return { orders: Array.isArray(parsed.orders) ? parsed.orders : [] }
  } catch {
    return { orders: [] }
  }
}

async function writeLocalStore(store: CommerceStoreShape) {
  const filePath = getStorePath()
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, JSON.stringify(store, null, 2), 'utf8')
}

function getSupabaseClient() {
  if (process.env.APP_DATA_MODE?.trim() !== 'supabase') return null
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

function parsePrice(value: string | null | undefined) {
  const normalized = String(value ?? '').replace(',', '.').replace(/[^\d.]/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseMeta(value: string | null): LeadBookingCommerceMeta | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as LeadBookingCommerceMeta
    return parsed && parsed.commerce === true ? parsed : null
  } catch {
    return null
  }
}

function leadRowToOrder(row: LeadBookingRow): CommerceOrder | null {
  const meta = parseMeta(row.admin_notes)
  if (!meta) return null
  const hasStoredAccessCode = meta.productType === 'ebook' && row.calendar_url?.startsWith(ACCESS_CODE_PREFIX)

  return {
    id: row.id,
    orderNumber: row.preferred_slots,
    customerEmail: row.email,
    customerName: row.name,
    customerPhone: meta.customerPhone,
    productType: meta.productType,
    productId: meta.productId,
    productName: row.service_label,
    amount: meta.amount || parsePrice(row.service_price),
    onlineAmount: meta.onlineAmount,
    manualAmount: meta.manualAmount,
    currency: meta.currency,
    paymentMethod: (row.payment_method as CommercePaymentMethod | null) ?? null,
    status: meta.status,
    accessCode: hasStoredAccessCode ? row.calendar_url!.slice(ACCESS_CODE_PREFIX.length) : null,
    accessCodeStatus: hasStoredAccessCode ? meta.accessCodeStatus : null,
    accessCodeUsageCount: meta.accessCodeUsageCount,
    accessCodeUsageLimit: meta.accessCodeUsageLimit,
    accessCodeExpiresAt: hasStoredAccessCode ? meta.accessCodeExpiresAt : null,
    adminConfirmationToken: row.payment_link?.startsWith(CONFIRM_TOKEN_PREFIX)
      ? row.payment_link.slice(CONFIRM_TOKEN_PREFIX.length)
      : null,
    adminConfirmationTokenUsedAt: meta.adminConfirmationTokenUsedAt,
    adminConfirmationIp: meta.adminConfirmationIp,
    adminConfirmationUserAgent: meta.adminConfirmationUserAgent,
    stripeCheckoutSessionId: meta.stripeCheckoutSessionId,
    providerPaymentId: meta.providerPaymentId,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: meta.paidAt ?? row.paid_at,
    accessSentAt: meta.accessSentAt,
    paymentReportedAt: meta.paymentReportedAt,
    cancelledAt: meta.cancelledAt,
    meta: meta.meta,
  }
}

function orderToLeadMeta(order: CommerceOrder): LeadBookingCommerceMeta {
  return {
    commerce: true,
    status: order.status,
    productType: order.productType,
    productId: order.productId,
    amount: order.amount,
    onlineAmount: order.onlineAmount,
    manualAmount: order.manualAmount,
    currency: order.currency,
    customerPhone: order.customerPhone,
    accessCodeStatus: order.accessCodeStatus,
    accessCodeUsageCount: order.accessCodeUsageCount,
    accessCodeUsageLimit: order.accessCodeUsageLimit,
    accessCodeExpiresAt: order.accessCodeExpiresAt,
    adminConfirmationTokenUsedAt: order.adminConfirmationTokenUsedAt,
    adminConfirmationIp: order.adminConfirmationIp,
    adminConfirmationUserAgent: order.adminConfirmationUserAgent,
    stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    providerPaymentId: order.providerPaymentId,
    paidAt: order.paidAt,
    accessSentAt: order.accessSentAt,
    paymentReportedAt: order.paymentReportedAt,
    cancelledAt: order.cancelledAt,
    meta: order.meta,
  }
}

function createOrderRecord(input: CommerceCreateOrderInput): CommerceOrder {
  const createdAt = nowIso()
  const amount = Number(input.amount)
  const productType = input.productType

  return {
    id: randomUUID(),
    orderNumber: makeOrderNumber(),
    customerEmail: normalizeCommerceEmail(input.customerEmail),
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone?.trim() || null,
    productType,
    productId: input.productId,
    productName: input.productName,
    amount,
    onlineAmount: input.onlineAmount ?? amount,
    manualAmount: input.manualAmount ?? getManualAmountForProduct(productType, amount),
    currency: 'PLN',
    paymentMethod: null,
    status: 'created',
    accessCode: null,
    accessCodeStatus: null,
    accessCodeUsageCount: 0,
    accessCodeUsageLimit: getAccessUsageLimit(productType),
    accessCodeExpiresAt: null,
    adminConfirmationToken: null,
    adminConfirmationTokenUsedAt: null,
    adminConfirmationIp: null,
    adminConfirmationUserAgent: null,
    stripeCheckoutSessionId: null,
    providerPaymentId: null,
    createdAt,
    updatedAt: createdAt,
    paidAt: null,
    accessSentAt: null,
    paymentReportedAt: null,
    cancelledAt: null,
    meta: input.meta ?? {},
  }
}

async function insertSupabaseOrder(order: CommerceOrder): Promise<CommerceOrder | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('lead_bookings')
    .insert({
      id: order.id,
      access_token: randomBytes(24).toString('hex'),
      created_at: order.createdAt,
      updated_at: order.updatedAt,
      status: 'pending',
      service: `commerce:${order.productType}:${order.productId}`.slice(0, 180),
      service_label: order.productName,
      service_price: String(order.amount),
      name: order.customerName,
      email: order.customerEmail,
      species: order.meta.animalType === 'Kot' || order.meta.animalType === 'kot' ? 'kot' : 'pies',
      description: `Zamówienie płatności ${order.orderNumber}: ${order.productName}`,
      preferred_slots: order.orderNumber,
      payment_method: order.paymentMethod,
      payment_link: order.adminConfirmationToken ? `${CONFIRM_TOKEN_PREFIX}${order.adminConfirmationToken}` : null,
      paid_at: order.paidAt,
      calendar_url: usesAccessCode(order) && order.accessCode ? `${ACCESS_CODE_PREFIX}${order.accessCode}` : null,
      admin_notes: JSON.stringify(orderToLeadMeta(order)),
    })
    .select()
    .single()

  if (error) {
    console.warn('[commerce] Supabase lead_bookings insert failed, using local fallback', error.message)
    return null
  }

  return leadRowToOrder(data as LeadBookingRow)
}

async function updateSupabaseOrder(order: CommerceOrder): Promise<CommerceOrder | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('lead_bookings')
    .update({
      updated_at: order.updatedAt,
      status: order.status === 'access_sent' || order.status === 'paid' ? 'paid' : order.status === 'cancelled' ? 'cancelled' : 'awaiting_payment',
      service_label: order.productName,
      service_price: String(order.amount),
      name: order.customerName,
      email: order.customerEmail,
      payment_method: order.paymentMethod,
      payment_link: order.adminConfirmationToken ? `${CONFIRM_TOKEN_PREFIX}${order.adminConfirmationToken}` : null,
      paid_at: order.paidAt,
      calendar_url: usesAccessCode(order) && order.accessCode ? `${ACCESS_CODE_PREFIX}${order.accessCode}` : null,
      admin_notes: JSON.stringify(orderToLeadMeta(order)),
    })
    .eq('preferred_slots', order.orderNumber)
    .select()
    .maybeSingle()

  if (error) {
    console.warn('[commerce] Supabase lead_bookings update failed, using local fallback', error.message)
    return null
  }

  return data ? leadRowToOrder(data as LeadBookingRow) : null
}

async function findSupabaseOrderBy(field: 'preferred_slots' | 'payment_link' | 'calendar_url', value: string) {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('lead_bookings')
    .select('*')
    .eq(field, value)
    .maybeSingle()

  if (error) {
    console.warn('[commerce] Supabase lead_bookings select failed, using local fallback', error.message)
    return null
  }

  return data ? leadRowToOrder(data as LeadBookingRow) : null
}

async function mutateLocalOrder(orderNumber: string, mutate: (order: CommerceOrder) => CommerceOrder): Promise<CommerceOrder | null> {
  const store = await readLocalStore()
  const index = store.orders.findIndex((order) => order.orderNumber === orderNumber)
  if (index < 0) return null
  const updated = mutate(store.orders[index])
  store.orders[index] = updated
  await writeLocalStore(store)
  return updated
}

async function saveOrder(order: CommerceOrder): Promise<CommerceOrder> {
  order.updatedAt = nowIso()

  const supabaseUpdated = await updateSupabaseOrder(order)
  if (supabaseUpdated) return supabaseUpdated

  const local = await mutateLocalOrder(order.orderNumber, () => order)
  if (local) return local

  const store = await readLocalStore()
  store.orders.unshift(order)
  await writeLocalStore(store)
  return order
}

export async function createCommerceOrder(input: CommerceCreateOrderInput): Promise<CommerceOrder> {
  const order = createOrderRecord(input)

  const supabaseOrder = await insertSupabaseOrder(order)
  if (supabaseOrder) return supabaseOrder

  const store = await readLocalStore()
  while (store.orders.some((item) => item.orderNumber === order.orderNumber)) {
    order.orderNumber = makeOrderNumber()
  }
  store.orders.unshift(order)
  await writeLocalStore(store)
  return order
}

export async function findCommerceOrderByProduct(productType: CommerceOrder['productType'], productId: string) {
  const store = await readLocalStore()
  const local = store.orders.find(
    (order) =>
      order.productType === productType &&
      order.productId === productId &&
      !['cancelled', 'expired'].includes(order.status),
  )
  if (local) return local

  const supabase = getSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('lead_bookings')
    .select('*')
    .eq('service', `commerce:${productType}:${productId}`.slice(0, 180))
    .order('created_at', { ascending: false })
    .limit(1)

  if (error || !data?.[0]) return null
  return leadRowToOrder(data[0] as LeadBookingRow)
}

export async function getCommerceOrder(orderNumber: string): Promise<CommerceOrder | null> {
  const normalized = orderNumber.trim().toUpperCase()
  const supabaseOrder = await findSupabaseOrderBy('preferred_slots', normalized)
  if (supabaseOrder) return supabaseOrder

  const store = await readLocalStore()
  return store.orders.find((order) => order.orderNumber === normalized) ?? null
}

export async function listCommerceOrdersByEmail(email: string): Promise<CommerceOrder[]> {
  const normalized = normalizeCommerceEmail(email)
  const supabase = getSupabaseClient()

  if (supabase) {
    const { data, error } = await supabase
      .from('lead_bookings')
      .select('*')
      .eq('email', normalized)
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('[commerce] Supabase lead_bookings list by email failed, using local fallback', error.message)
    } else {
      return (data as LeadBookingRow[])
        .map(leadRowToOrder)
        .filter((order): order is CommerceOrder => Boolean(order))
    }
  }

  const store = await readLocalStore()
  return store.orders
    .filter((order) => order.customerEmail === normalized)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getCommerceOrderByConfirmationToken(token: string): Promise<CommerceOrder | null> {
  const supabaseOrder = await findSupabaseOrderBy('payment_link', `${CONFIRM_TOKEN_PREFIX}${token}`)
  if (supabaseOrder) return supabaseOrder

  const store = await readLocalStore()
  return store.orders.find((order) => order.adminConfirmationToken === token) ?? null
}

export async function getCommerceOrderByAccessCode(code: string, email?: string | null): Promise<CommerceOrder | null> {
  const normalizedCode = code.trim().toUpperCase()
  const supabaseOrder = await findSupabaseOrderBy('calendar_url', `${ACCESS_CODE_PREFIX}${normalizedCode}`)
  if (supabaseOrder && (!email || supabaseOrder.customerEmail === normalizeCommerceEmail(email))) {
    return supabaseOrder
  }

  const store = await readLocalStore()
  return (
    store.orders.find(
      (order) =>
        order.accessCode === normalizedCode &&
        (!email || order.customerEmail === normalizeCommerceEmail(email)),
    ) ?? null
  )
}

export async function prepareCommerceManualPayment(orderNumber: string): Promise<CommerceOrder | null> {
  const order = await getCommerceOrder(orderNumber)
  if (!order) return null

  if (!order.adminConfirmationToken) {
    order.adminConfirmationToken = makeConfirmationToken()
  }
  order.paymentMethod = 'blik_phone'
  if (order.status === 'created') {
    order.status = 'waiting_manual_payment'
  }

  return saveOrder(order)
}

export async function reportCommerceManualPayment(orderNumber: string): Promise<CommerceOrder | null> {
  const order = await prepareCommerceManualPayment(orderNumber)
  if (!order) return null

  order.status = 'payment_reported'
  order.paymentReportedAt = nowIso()

  return saveOrder(order)
}

export async function attachCommerceStripeSession(orderNumber: string, sessionId: string): Promise<CommerceOrder | null> {
  const order = await getCommerceOrder(orderNumber)
  if (!order) return null

  order.paymentMethod = 'online'
  order.stripeCheckoutSessionId = sessionId
  order.providerPaymentId = sessionId

  return saveOrder(order)
}

export async function fulfillCommerceOrder(
  orderNumber: string,
  paymentMethod: CommercePaymentMethod,
  options?: {
    providerPaymentId?: string | null
    adminTokenUsedAt?: string | null
    adminIp?: string | null
    adminUserAgent?: string | null
  },
): Promise<CommerceOrder | null> {
  const order = await getCommerceOrder(orderNumber)
  if (!order) return null

  if (usesAccessCode(order) && !order.accessCode) {
    order.accessCode = makeAccessCode()
    order.accessCodeStatus = 'active'
    order.accessCodeExpiresAt = getAccessExpiry(order.productType)
  } else if (!usesAccessCode(order)) {
    order.accessCode = null
    order.accessCodeStatus = null
    order.accessCodeExpiresAt = null
    order.accessCodeUsageCount = 0
  }

  order.paymentMethod = paymentMethod
  order.status = usesAccessCode(order) ? 'access_sent' : 'paid'
  order.paidAt = order.paidAt ?? nowIso()
  order.accessSentAt = usesAccessCode(order) ? order.accessSentAt ?? nowIso() : order.accessSentAt
  order.providerPaymentId = options?.providerPaymentId ?? order.providerPaymentId

  if (options?.adminTokenUsedAt) {
    order.adminConfirmationTokenUsedAt = options.adminTokenUsedAt
    order.adminConfirmationIp = options.adminIp ?? null
    order.adminConfirmationUserAgent = options.adminUserAgent ?? null
  }

  return saveOrder(order)
}

export async function rejectCommerceManualPayment(
  orderNumber: string,
  options?: {
    adminTokenUsedAt?: string | null
    adminIp?: string | null
    adminUserAgent?: string | null
  },
): Promise<CommerceOrder | null> {
  const order = await getCommerceOrder(orderNumber)
  if (!order) return null
  order.status = 'cancelled'
  order.cancelledAt = nowIso()
  order.adminConfirmationTokenUsedAt = options?.adminTokenUsedAt ?? order.adminConfirmationTokenUsedAt
  order.adminConfirmationIp = options?.adminIp ?? order.adminConfirmationIp
  order.adminConfirmationUserAgent = options?.adminUserAgent ?? order.adminConfirmationUserAgent
  return saveOrder(order)
}

export function canUseCommerceAccess(order: CommerceOrder) {
  if (!usesAccessCode(order)) return false
  if (!order.accessCode || order.accessCodeStatus !== 'active') return false
  if (order.status !== 'access_sent' && order.status !== 'paid') return false
  if (order.accessCodeExpiresAt && Date.now() > Date.parse(order.accessCodeExpiresAt)) return false
  if (order.accessCodeUsageCount >= order.accessCodeUsageLimit) return false
  return true
}

export async function recordCommerceAccessUse(orderNumber: string): Promise<CommerceOrder | null> {
  const order = await getCommerceOrder(orderNumber)
  if (!order || !canUseCommerceAccess(order)) return null
  order.accessCodeUsageCount += 1
  if (order.accessCodeUsageCount >= order.accessCodeUsageLimit) {
    order.accessCodeStatus = 'used'
  }
  return saveOrder(order)
}
