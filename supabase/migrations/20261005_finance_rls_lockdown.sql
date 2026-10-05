-- Finance RLS lockdown.
--
-- transactions had, besides the privileged policy, two policies open to EVERY
-- authenticated user ("Authenticated read transactions" / "Authenticated write
-- transactions", USING true): any logged-in member could read, edit and
-- delete the club's books straight from the browser with the anon key.
-- budget_categories has the same pair.
--
-- Dependency check (every access found in the code):
--   * browser clients: components/admin/TransactionManager.tsx and
--     components/admin/BudgetReport.tsx, both rendered only by
--     /admin/finance, which is gated by requirePrivilegedAccess() (bod/director;
--     the superadmin finullistefano@gmail.com has role 'bod'). They keep working
--     through is_privileged().
--   * everything else (api/admin/analytics/internal, api/finance/refund,
--     api/stripe/webhook, lib/stripe-finance.ts, lib/refunds.ts) uses the
--     service role and bypasses RLS.
-- Nothing depends on the open policies, so no code had to move to server routes.

DROP POLICY IF EXISTS "Authenticated read transactions"  ON transactions;
DROP POLICY IF EXISTS "Authenticated write transactions" ON transactions;
-- "transactions_privileged_all" (is_privileged()) stays.

DROP POLICY IF EXISTS "Authenticated read budget_categories"  ON budget_categories;
DROP POLICY IF EXISTS "Authenticated write budget_categories" ON budget_categories;
DROP POLICY IF EXISTS "budget_categories_privileged_all" ON budget_categories;
CREATE POLICY "budget_categories_privileged_all"
  ON budget_categories FOR ALL
  TO authenticated
  USING (public.is_privileged())
  WITH CHECK (public.is_privileged());

-- Check after applying (as a non-privileged member, via the anon key):
--   select count(*) from transactions;        -- must return 0
--   insert into transactions ...              -- must fail with an RLS error
