-- Seed: 5 sample invoices for local/dev verification (Phase 0).
--
-- Run after the tl_invoices migration. Safe to re-run: it clears existing rows
-- first so the seed stays deterministic (5 rows, varied statuses).

begin;

-- Start from a clean slate so re-seeding never duplicates.
delete from public.tl_invoices;

insert into public.tl_invoices (customer, amount, status, due_date, created_at)
values
  ('Acme Corporation',   1250.00, 'paid',    date '2026-07-01', now() - interval '6 days'),
  ('Globex Industries',   980.50, 'pending', date '2026-07-20', now() - interval '4 days'),
  ('Initech LLC',        3200.75, 'overdue', date '2026-06-15', now() - interval '3 days'),
  ('Umbrella Co.',        450.00, 'draft',   date '2026-08-05', now() - interval '1 day'),
  ('Stark Enterprises',  7600.00, 'pending', date '2026-07-31', now());

commit;
