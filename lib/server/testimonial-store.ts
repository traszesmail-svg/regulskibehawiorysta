import { createClient } from '@supabase/supabase-js'
import { getSupabaseServerConfig } from '@/lib/server/env'

export type PendingTestimonialStatus = 'pending' | 'published' | 'skipped'

export type PendingTestimonialRecord = {
  id: string
  createdAt: string
  status: PendingTestimonialStatus
  displayName: string
  email: string
  issueCategory: string
  opinion: string
  photoUrl: string | null
  consentPublish: boolean
}

type PendingTestimonialRow = {
  id: string
  created_at: string
  status: string
  display_name: string
  email: string
  issue_category: string
  opinion: string
  photo_url: string | null
  consent_publish: boolean
}

function getSupabaseAdmin() {
  const config = getSupabaseServerConfig('testimonial-store')
  return createClient(config.url, config.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function mapRow(row: PendingTestimonialRow): PendingTestimonialRecord {
  return {
    id: row.id,
    createdAt: row.created_at,
    status: row.status as PendingTestimonialStatus,
    displayName: row.display_name,
    email: row.email,
    issueCategory: row.issue_category,
    opinion: row.opinion,
    photoUrl: row.photo_url,
    consentPublish: row.consent_publish,
  }
}

export async function createPendingTestimonial(input: {
  displayName: string
  email: string
  issueCategory: string
  opinion: string
  photoUrl: string | null
  consentPublish: boolean
}): Promise<PendingTestimonialRecord> {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('pending_testimonials')
    .insert({
      display_name: input.displayName,
      email: input.email,
      issue_category: input.issueCategory,
      opinion: input.opinion,
      photo_url: input.photoUrl || null,
      consent_publish: input.consentPublish,
      status: 'pending',
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`createPendingTestimonial failed: ${error?.message}`)
  }

  return mapRow(data as PendingTestimonialRow)
}

export async function listPendingTestimonials(status?: PendingTestimonialStatus): Promise<PendingTestimonialRecord[]> {
  const supabase = getSupabaseAdmin()
  let query = supabase.from('pending_testimonials').select('*').order('created_at', { ascending: false })

  if (status) {
    query = query.eq('status', status)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`listPendingTestimonials failed: ${error.message}`)
  }

  return (data ?? []).map((row) => mapRow(row as PendingTestimonialRow))
}

export async function listPublishedTestimonials(): Promise<PendingTestimonialRecord[]> {
  return listPendingTestimonials('published')
}

export async function updatePendingTestimonialStatus(
  id: string,
  status: PendingTestimonialStatus,
): Promise<void> {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase
    .from('pending_testimonials')
    .update({ status })
    .eq('id', id)

  if (error) {
    throw new Error(`updatePendingTestimonialStatus failed: ${error.message}`)
  }
}
