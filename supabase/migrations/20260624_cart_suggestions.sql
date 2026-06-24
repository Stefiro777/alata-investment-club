-- Cart Suggestions table for booking upsell
create table if not exists cart_suggestions (
  id           uuid primary key default gen_random_uuid(),
  type         text not null check (type in ('career_service', 'merch_product')),
  reference_id uuid not null,
  label        text not null,
  description  text,
  visible      boolean not null default true,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

-- RLS
alter table cart_suggestions enable row level security;

-- Public can read visible suggestions
create policy "cart_suggestions_select_public"
  on cart_suggestions for select
  using (true);

-- Only service role (backend) can insert/update/delete
-- (No policy needed — service role bypasses RLS)
