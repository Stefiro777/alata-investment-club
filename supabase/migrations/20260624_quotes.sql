CREATE TABLE IF NOT EXISTS quotes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number         text NOT NULL UNIQUE,  -- e.g. ALATA-2026-001
  recipient_name text NOT NULL,
  recipient_email text,
  recipient_org  text,
  subject        text NOT NULL,
  items          jsonb NOT NULL DEFAULT '[]',  -- [{description, qty, unit_price}]
  total          numeric(10,2) NOT NULL DEFAULT 0,
  notes          text,
  issued_at      date NOT NULL DEFAULT CURRENT_DATE,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quotes_access" ON quotes
  USING (
    (SELECT role FROM club_members WHERE email = auth.email()) IN ('bod','director')
    OR auth.email() = 'finullistefano@gmail.com'
  )
  WITH CHECK (
    (SELECT role FROM club_members WHERE email = auth.email()) IN ('bod','director')
    OR auth.email() = 'finullistefano@gmail.com'
  );
