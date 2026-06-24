-- Products
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  name         text NOT NULL,
  price_cents  int  NOT NULL DEFAULT 0,
  description  text,
  sizes        text[],
  details      jsonb,  -- { material, dimensions, care, shipping }
  visible      boolean NOT NULL DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_select_visible" ON products FOR SELECT USING (visible = true);

-- Product colour variants (images per colour)
CREATE TABLE IF NOT EXISTS product_variants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  color       text NOT NULL,
  color_hex   text,
  images      text[],
  sort_order  int DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variants_select" ON product_variants FOR SELECT USING (true);

-- Product text/personalisation variants
CREATE TABLE IF NOT EXISTS product_text_variants (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  option     text NOT NULL,
  sort_order int DEFAULT 0
);

ALTER TABLE product_text_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_text_variants_select" ON product_text_variants FOR SELECT USING (true);

-- Settings seed
INSERT INTO settings (key, value)
VALUES ('merch_page_visible', 'true')
ON CONFLICT (key) DO NOTHING;

-- Merch budget category
INSERT INTO budget_categories (name, type)
VALUES ('Merch', 'revenue')
ON CONFLICT DO NOTHING;
