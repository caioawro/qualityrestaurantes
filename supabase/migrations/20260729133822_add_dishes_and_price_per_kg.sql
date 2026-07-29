-- Add price_per_kg to processing (cost of raw protein per kg)
ALTER TABLE processing ADD COLUMN IF NOT EXISTS price_per_kg numeric(10,2) NOT NULL DEFAULT 0;

-- =========================================================
-- dishes (technical recipe sheets)
-- =========================================================
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dishes" ON dishes;
CREATE POLICY "anon_select_dishes" ON dishes FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dishes" ON dishes;
CREATE POLICY "anon_insert_dishes" ON dishes FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dishes" ON dishes;
CREATE POLICY "anon_update_dishes" ON dishes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dishes" ON dishes;
CREATE POLICY "anon_delete_dishes" ON dishes FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- dish_items (ingredients in a dish)
-- =========================================================
CREATE TABLE IF NOT EXISTS dish_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  item_type text NOT NULL DEFAULT 'manual',
  name text NOT NULL,
  quantity numeric(10,3) NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT 'porção',
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  processing_id uuid REFERENCES processing(id) ON DELETE SET NULL,
  cut_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dish_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_dish_items" ON dish_items;
CREATE POLICY "anon_select_dish_items" ON dish_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_dish_items" ON dish_items;
CREATE POLICY "anon_insert_dish_items" ON dish_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_dish_items" ON dish_items;
CREATE POLICY "anon_update_dish_items" ON dish_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_dish_items" ON dish_items;
CREATE POLICY "anon_delete_dish_items" ON dish_items FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_dish_items_dish ON dish_items(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_items_processing ON dish_items(processing_id);

INSERT INTO units (name, active) VALUES ('Caravaggio', true), ('Matisse', true)
ON CONFLICT DO NOTHING;
