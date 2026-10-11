-- Migration 20261011004_stage4_controlled_sms_promotion.sql
-- Stage 4: Controlled technical SMS promotion gate from caller_sms_preparations to phone_agent_sms_queue.

alter table public.caller_sms_preparations
  add column if not exists promoted_at timestamptz,
  add column if not exists queue_item_id uuid references public.phone_agent_sms_queue(id) on delete set null,
  add column if not exists approval_id text;

-- Extend status check constraint to include 'promoted'
alter table public.caller_sms_preparations
  drop constraint if exists caller_sms_preparations_status_check;

alter table public.caller_sms_preparations
  add constraint caller_sms_preparations_status_check
  check (status in ('prepared', 'do_not_send', 'promoted'));

create unique index if not exists caller_sms_preparations_approval_id_idx
  on public.caller_sms_preparations (approval_id)
  where approval_id is not null;

create index if not exists caller_sms_preparations_promoted_at_idx
  on public.caller_sms_preparations (promoted_at desc)
  where promoted_at is not null;

create index if not exists caller_sms_preparations_queue_item_id_idx
  on public.caller_sms_preparations (queue_item_id)
  where queue_item_id is not null;

grant select, insert, update on table public.caller_sms_preparations to service_role;
