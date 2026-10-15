-- Merch stock. NULL = unlimited (every existing product keeps selling as before).
--   products.stock          units of the product across all colours/sizes
--   product_variants.stock  units of one colour
--   products.size_stock     units per size, e.g. {"S": 5, "M": 10}
-- A purchase is limited by the smallest cap that applies to it.
-- Additive only: no existing row or value is modified.

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_stock_check;
ALTER TABLE products ADD CONSTRAINT products_stock_check CHECK (stock IS NULL OR stock >= 0);

ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE product_variants DROP CONSTRAINT IF EXISTS product_variants_stock_check;
ALTER TABLE product_variants ADD CONSTRAINT product_variants_stock_check CHECK (stock IS NULL OR stock >= 0);

ALTER TABLE products ADD COLUMN IF NOT EXISTS size_stock jsonb;

-- One row per Stripe Checkout Session (or free order id) whose stock was already
-- decremented: this is what makes the decrement idempotent across webhook retries.
CREATE TABLE IF NOT EXISTS merch_stock_movements (
  stripe_session_id text PRIMARY KEY,
  items             jsonb NOT NULL,
  shortfalls        jsonb,
  created_at        timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE merch_stock_movements ENABLE ROW LEVEL SECURITY; -- no policies: service role only

-- Atomic, idempotent decrement.
--   p_items: [{ "product_id": uuid, "variant_color": text|null, "size": text|null, "quantity": int }]
-- Runs in ONE transaction and locks each product row, so concurrent purchases
-- serialise and no counter ever goes below zero. If a paid order asks for more
-- than what is left (race between checkout and webhook) the counter is clamped
-- to 0 and the gap is reported in "shortfalls" (and stored) instead of failing:
-- the customer has already paid, the team has to handle it.
CREATE OR REPLACE FUNCTION public.decrement_merch_stock(p_session_id text, p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item       jsonb;
  v_pid        uuid;
  v_color      text;
  v_size       text;
  v_qty        integer;
  v_stock      integer;
  v_size_stock jsonb;
  v_var_id     uuid;
  v_var_stock  integer;
  v_left       integer;
  v_shortfalls jsonb := '[]'::jsonb;
  v_rows       integer;
BEGIN
  INSERT INTO merch_stock_movements (stripe_session_id, items)
  VALUES (p_session_id, p_items)
  ON CONFLICT (stripe_session_id) DO NOTHING;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN
    RETURN jsonb_build_object('applied', false, 'reason', 'already_applied');
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid   := (v_item->>'product_id')::uuid;
    v_color := NULLIF(v_item->>'variant_color', '');
    v_size  := NULLIF(v_item->>'size', '');
    v_qty   := GREATEST(COALESCE((v_item->>'quantity')::integer, 1), 1);

    -- Row lock: serialises every purchase of this product.
    SELECT stock, size_stock INTO v_stock, v_size_stock
      FROM products WHERE id = v_pid FOR UPDATE;
    IF NOT FOUND THEN CONTINUE; END IF;

    -- Product total
    IF v_stock IS NOT NULL THEN
      IF v_stock < v_qty THEN
        v_shortfalls := v_shortfalls || jsonb_build_object('product_id', v_pid, 'level', 'product', 'missing', v_qty - v_stock);
      END IF;
      UPDATE products SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_pid;
    END IF;

    -- Colour
    IF v_color IS NOT NULL THEN
      SELECT id, stock INTO v_var_id, v_var_stock
        FROM product_variants WHERE product_id = v_pid AND color = v_color
        ORDER BY sort_order LIMIT 1 FOR UPDATE;
      IF FOUND AND v_var_stock IS NOT NULL THEN
        IF v_var_stock < v_qty THEN
          v_shortfalls := v_shortfalls || jsonb_build_object('product_id', v_pid, 'level', 'variant', 'color', v_color, 'missing', v_qty - v_var_stock);
        END IF;
        UPDATE product_variants SET stock = GREATEST(stock - v_qty, 0) WHERE id = v_var_id;
      END IF;
    END IF;

    -- Size
    IF v_size IS NOT NULL AND v_size_stock IS NOT NULL AND v_size_stock ? v_size
       AND jsonb_typeof(v_size_stock->v_size) = 'number' THEN
      v_left := (v_size_stock->>v_size)::integer;
      IF v_left < v_qty THEN
        v_shortfalls := v_shortfalls || jsonb_build_object('product_id', v_pid, 'level', 'size', 'size', v_size, 'missing', v_qty - v_left);
      END IF;
      UPDATE products
         SET size_stock = jsonb_set(size_stock, ARRAY[v_size], to_jsonb(GREATEST(v_left - v_qty, 0)))
       WHERE id = v_pid;
    END IF;
  END LOOP;

  IF jsonb_array_length(v_shortfalls) > 0 THEN
    UPDATE merch_stock_movements SET shortfalls = v_shortfalls WHERE stripe_session_id = p_session_id;
  END IF;
  RETURN jsonb_build_object('applied', true, 'shortfalls', v_shortfalls);
END;
$$;

REVOKE ALL ON FUNCTION public.decrement_merch_stock(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decrement_merch_stock(text, jsonb) TO service_role;
