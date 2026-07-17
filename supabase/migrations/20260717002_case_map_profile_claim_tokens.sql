alter table public.case_map_profile_claims
  add column if not exists claim_token_hash text;

-- The preceding rollout was not public yet. If a row was written during the
-- deployment window, invalidate it rather than allowing an e-mail-only claim.
update public.case_map_profile_claims
set claim_token_hash = encode(extensions.gen_random_bytes(32), 'hex')
where claim_token_hash is null;

alter table public.case_map_profile_claims
  alter column claim_token_hash set not null;

create unique index if not exists case_map_profile_claims_token_idx
  on public.case_map_profile_claims(claim_token_hash);
