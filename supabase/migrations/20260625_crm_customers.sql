-- CRM Customers table
create table if not exists crm_customers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  email          text not null,
  phone          text,
  type           text not null check (type in ('career_service','merch','event','membership')),
  reference      text,
  amount         numeric(10,2),
  purchased_at   timestamptz default now(),
  notes          text,
  created_at     timestamptz default now()
);

-- RLS
alter table crm_customers enable row level security;

create policy "crm_customers_admin" on crm_customers
  for all
  using (
    (auth.jwt() ->> 'email') = 'finullistefano@gmail.com'
    or exists (
      select 1 from club_members
      where email = (auth.jwt() ->> 'email')
      and role in ('bod','director')
    )
  )
  with check (
    (auth.jwt() ->> 'email') = 'finullistefano@gmail.com'
    or exists (
      select 1 from club_members
      where email = (auth.jwt() ->> 'email')
      and role in ('bod','director')
    )
  );
