-- ============================================================
-- Стать користувача (для фільтра "кого можна запрошувати") та
-- обмеження заходу за статтю/квотами.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('male', 'female'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS allowed_gender text CHECK (allowed_gender IN ('any', 'male', 'female')) DEFAULT 'any';
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_male int;
ALTER TABLE events ADD COLUMN IF NOT EXISTS max_female int;
