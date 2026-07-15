-- Migration: create the tl_invoices table
--
-- Purpose: the core Phase 0 table backing the invoices list view.
-- Convention: all Testing Lab tables are prefixed `tl_` (see PRODUCT-REFERENCE).
--
-- Apply this either via the Supabase Dashboard SQL editor or the Supabase CLI
-- (`supabase db push`). It is idempotent-ish: safe to re-run on a fresh project.

-- 1. Table -------------------------------------------------------------------
create table if not exists public.tl_invoices (
  id          uuid primary key default gen_random_uuid(),
  customer    text not null,
  amount      numeric(12, 2) not null default 0,
  status      text not null default 'pending'
              check (status in ('draft', 'pending', 'paid', 'overdue')),
  due_date    date not null,
  created_at  timestamptz not null default now()
);

-- 2. Helpful index for the "newest first" list ordering ----------------------
create index if not exists tl_invoices_created_at_idx
  on public.tl_invoices (created_at desc);

-- 3. Row Level Security ------------------------------------------------------
-- Enable RLS so the table is not implicitly world-open, then add an explicit
-- read policy. This is a learning lab with non-sensitive dummy data, so we
-- allow public SELECT (the app talks to Supabase with the publishable/anon
-- key and no auth UI). Write policies are added later alongside the
-- create/edit/delete features — nothing is granted "for theory" up front.
alter table public.tl_invoices enable row level security;

drop policy if exists "tl_invoices public read" on public.tl_invoices;
create policy "tl_invoices public read"
  on public.tl_invoices
  for select
  to anon, authenticated
  using (true);
