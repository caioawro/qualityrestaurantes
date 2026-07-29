/*
# Protein Processing Control Platform — Core Schema

## Overview
Creates the full schema for a protein-beneficiamento (processing) control platform.
This is a single-tenant app with NO sign-in for collaborators, so all tables use
`TO anon, authenticated` policies (the frontend uses the anon key).

## New Tables
- `units` — processing units/locations (e.g. kitchens, plants).
- `employees` — people responsible for performing beneficiamentos.
- `categories` — protein categories (e.g. Bovina, Suína, Frango).
- `proteins` — proteins with expected loss % and color.
- `cuts` — cut types linked to a protein, with a gramatura (grams per unit).
- `processing` — a single beneficiamento record (header).
- `processing_items` — the cuts produced in a beneficiamento (lines).
- `processing_byproducts` — optional byproducts (trim, bone, fat, etc.).
- `settings` — key/value parameters (e.g. max loss percentage).

## Storage
- Buckets `processing-before` and `processing-after` are created (public read).

## Security
- RLS enabled on every table.
- All tables allow anon + authenticated CRUD (intentionally shared operational data).
- Storage buckets are public for read; writes allowed for anon + authenticated.
*/

-- =========================================================
-- units
-- =========================================================
CREATE TABLE IF NOT EXISTS units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE units ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_units" ON units;
CREATE POLICY "anon_select_units" ON units FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_units" ON units;
CREATE POLICY "anon_insert_units" ON units FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_units" ON units;
CREATE POLICY "anon_update_units" ON units FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_units" ON units;
CREATE POLICY "anon_delete_units" ON units FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- employees
-- =========================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_employees" ON employees;
CREATE POLICY "anon_select_employees" ON employees FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_employees" ON employees;
CREATE POLICY "anon_insert_employees" ON employees FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_employees" ON employees;
CREATE POLICY "anon_update_employees" ON employees FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_employees" ON employees;
CREATE POLICY "anon_delete_employees" ON employees FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- categories
-- =========================================================
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_categories" ON categories;
CREATE POLICY "anon_select_categories" ON categories FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_categories" ON categories;
CREATE POLICY "anon_insert_categories" ON categories FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_categories" ON categories;
CREATE POLICY "anon_update_categories" ON categories FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_categories" ON categories;
CREATE POLICY "anon_delete_categories" ON categories FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- proteins
-- =========================================================
CREATE TABLE IF NOT EXISTS proteins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  expected_loss numeric(5,2) NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#0ea5e9',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE proteins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_proteins" ON proteins;
CREATE POLICY "anon_select_proteins" ON proteins FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_proteins" ON proteins;
CREATE POLICY "anon_insert_proteins" ON proteins FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_proteins" ON proteins;
CREATE POLICY "anon_update_proteins" ON proteins FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_proteins" ON proteins;
CREATE POLICY "anon_delete_proteins" ON proteins FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- cuts
-- =========================================================
CREATE TABLE IF NOT EXISTS cuts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protein_id uuid NOT NULL REFERENCES proteins(id) ON DELETE CASCADE,
  name text NOT NULL,
  gramatura numeric(8,2) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cuts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cuts" ON cuts;
CREATE POLICY "anon_select_cuts" ON cuts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_cuts" ON cuts;
CREATE POLICY "anon_insert_cuts" ON cuts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_cuts" ON cuts;
CREATE POLICY "anon_update_cuts" ON cuts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_cuts" ON cuts;
CREATE POLICY "anon_delete_cuts" ON cuts FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- processing (header)
-- =========================================================
CREATE TABLE IF NOT EXISTS processing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  responsible text NOT NULL,
  unit_id uuid REFERENCES units(id) ON DELETE SET NULL,
  protein_id uuid NOT NULL REFERENCES proteins(id) ON DELETE RESTRICT,
  processing_date date NOT NULL DEFAULT CURRENT_DATE,
  processing_time time NOT NULL DEFAULT '00:00',
  gross_weight numeric(10,3) NOT NULL DEFAULT 0,
  before_photo_url text,
  after_photo_url text,
  produced_weight numeric(10,3) NOT NULL DEFAULT 0,
  byproduct_weight numeric(10,3) NOT NULL DEFAULT 0,
  loss_weight numeric(10,3) NOT NULL DEFAULT 0,
  loss_percentage numeric(5,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE processing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_processing" ON processing;
CREATE POLICY "anon_select_processing" ON processing FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_processing" ON processing;
CREATE POLICY "anon_insert_processing" ON processing FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_processing" ON processing;
CREATE POLICY "anon_update_processing" ON processing FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_processing" ON processing;
CREATE POLICY "anon_delete_processing" ON processing FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- processing_items (cuts produced)
-- =========================================================
CREATE TABLE IF NOT EXISTS processing_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_id uuid NOT NULL REFERENCES processing(id) ON DELETE CASCADE,
  cut_name text NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  gramatura numeric(8,2) NOT NULL DEFAULT 0,
  total_weight numeric(10,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE processing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_processing_items" ON processing_items;
CREATE POLICY "anon_select_processing_items" ON processing_items FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_processing_items" ON processing_items;
CREATE POLICY "anon_insert_processing_items" ON processing_items FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_processing_items" ON processing_items;
CREATE POLICY "anon_update_processing_items" ON processing_items FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_processing_items" ON processing_items;
CREATE POLICY "anon_delete_processing_items" ON processing_items FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- processing_byproducts
-- =========================================================
CREATE TABLE IF NOT EXISTS processing_byproducts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  processing_id uuid NOT NULL REFERENCES processing(id) ON DELETE CASCADE,
  description text NOT NULL,
  weight numeric(10,3) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE processing_byproducts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_processing_byproducts" ON processing_byproducts;
CREATE POLICY "anon_select_processing_byproducts" ON processing_byproducts FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_processing_byproducts" ON processing_byproducts;
CREATE POLICY "anon_insert_processing_byproducts" ON processing_byproducts FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_processing_byproducts" ON processing_byproducts;
CREATE POLICY "anon_update_processing_byproducts" ON processing_byproducts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_processing_byproducts" ON processing_byproducts;
CREATE POLICY "anon_delete_processing_byproducts" ON processing_byproducts FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- settings (key/value parameters)
-- =========================================================
CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_settings" ON settings;
CREATE POLICY "anon_select_settings" ON settings FOR SELECT
  TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_settings" ON settings;
CREATE POLICY "anon_insert_settings" ON settings FOR INSERT
  TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_settings" ON settings;
CREATE POLICY "anon_update_settings" ON settings FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_settings" ON settings;
CREATE POLICY "anon_delete_settings" ON settings FOR DELETE
  TO anon, authenticated USING (true);

-- =========================================================
-- Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_processing_date ON processing(processing_date);
CREATE INDEX IF NOT EXISTS idx_processing_protein ON processing(protein_id);
CREATE INDEX IF NOT EXISTS idx_processing_responsible ON processing(responsible);
CREATE INDEX IF NOT EXISTS idx_processing_items_processing ON processing_items(processing_id);
CREATE INDEX IF NOT EXISTS idx_processing_byproducts_processing ON processing_byproducts(processing_id);
CREATE INDEX IF NOT EXISTS idx_cuts_protein ON cuts(protein_id);

-- =========================================================
-- Storage buckets
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('processing-before', 'processing-before', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('processing-after', 'processing-after', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: allow anon + authenticated to upload and read.
DROP POLICY IF EXISTS "anon_upload_before" ON storage.objects;
CREATE POLICY "anon_upload_before" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'processing-before');

DROP POLICY IF EXISTS "anon_read_before" ON storage.objects;
CREATE POLICY "anon_read_before" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'processing-before');

DROP POLICY IF EXISTS "anon_upload_after" ON storage.objects;
CREATE POLICY "anon_upload_after" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'processing-after');

DROP POLICY IF EXISTS "anon_read_after" ON storage.objects;
CREATE POLICY "anon_read_after" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'processing-after');

-- Default settings
INSERT INTO settings (key, value) VALUES ('max_loss_percentage', '10')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('admin_password', 'admin123')
ON CONFLICT (key) DO NOTHING;
