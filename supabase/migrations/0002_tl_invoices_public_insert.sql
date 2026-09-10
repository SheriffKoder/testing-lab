-- Migration: allow anon/authenticated INSERT on tl_invoices
--
-- Purpose: Phase 2 Item 4 create-invoice E2E (and the real Create Invoice UI)
-- need writes. Phase 0 only granted public SELECT; writes were deferred until
-- create existed. This lab still has no auth UI — same publishable/anon key
-- used for reads — so grant an explicit insert policy (not a blanket open table).
--
-- Apply via Supabase Dashboard SQL editor or `supabase db push`.

drop policy if exists "tl_invoices public insert" on public.tl_invoices;
create policy "tl_invoices public insert"
  on public.tl_invoices
  for insert
  to anon, authenticated
  with check (true);
