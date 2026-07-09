-- Add photo_url to alumni (manual upload only, no LinkedIn auto-fetch — see AlumniSection admin UI)
ALTER TABLE alumni ADD COLUMN IF NOT EXISTS photo_url text;
