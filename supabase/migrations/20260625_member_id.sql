-- Add member_id to club_members
ALTER TABLE club_members ADD COLUMN IF NOT EXISTS member_id text unique;

-- Populate existing members with sequential IDs
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM club_members
  WHERE member_id IS NULL
)
UPDATE club_members
SET member_id = 'ALATA-' || LPAD((1000 + numbered.rn)::text, 4, '0')
FROM numbered
WHERE club_members.id = numbered.id;

-- Auto-generate member_id for new members
CREATE OR REPLACE FUNCTION generate_member_id()
RETURNS TRIGGER AS $$
DECLARE
  new_id text;
  counter int := 0;
BEGIN
  LOOP
    new_id := 'ALATA-' || LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM club_members WHERE member_id = new_id);
    counter := counter + 1;
    IF counter > 200 THEN
      RAISE EXCEPTION 'Could not generate unique member_id after 200 attempts';
    END IF;
  END LOOP;
  NEW.member_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_member_id ON club_members;
CREATE TRIGGER set_member_id
  BEFORE INSERT ON club_members
  FOR EACH ROW
  WHEN (NEW.member_id IS NULL)
  EXECUTE FUNCTION generate_member_id();
