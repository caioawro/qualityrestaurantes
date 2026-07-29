CREATE TABLE IF NOT EXISTS schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  days_of_week jsonb NOT NULL DEFAULT '[]'::jsonb,
  responsible text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules FORCE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for anon on schedules" ON schedules FOR ALL USING (true) WITH CHECK (true);
