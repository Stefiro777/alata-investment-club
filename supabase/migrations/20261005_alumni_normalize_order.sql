-- Alumni ordering: several rows share order_index = 0 (the column default), so
-- the public page and the admin list broke ties differently.
--
-- Renumber order_index 0..n-1 following the order the PUBLIC page currently
-- shows (order_index asc, ties by created_at desc), so the site does not
-- change visually; the admin list will now match it.
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           ORDER BY order_index ASC NULLS LAST, created_at DESC
         ) - 1 AS new_index
  FROM alumni
)
UPDATE alumni a
SET order_index = r.new_index
FROM ranked r
WHERE a.id = r.id
  AND a.order_index IS DISTINCT FROM r.new_index;
