-- ============================================================
-- Адмінка: ролі/бан користувачів, категорії та смішні статуси
-- стають редагованими (з іконками) замість захардкожених.
-- ============================================================

ALTER TABLE users ADD COLUMN is_admin boolean DEFAULT false;
ALTER TABLE users ADD COLUMN is_banned boolean DEFAULT false;
ALTER TABLE users ADD COLUMN ban_reason text;

-- `icon` used to hold an emoji; from now on it holds a lucide-react icon
-- name (e.g. "Volleyball") so both admin and frontend speak the same value.
ALTER TABLE categories RENAME COLUMN icon TO icon_name;
ALTER TABLE categories ADD COLUMN color text;
ALTER TABLE categories ADD COLUMN is_active boolean DEFAULT true;

UPDATE categories SET icon_name = 'Volleyball',      color = '#22C55E' WHERE name = 'Спорт';
UPDATE categories SET icon_name = 'Footprints',      color = '#3B82F6' WHERE name = 'Прогулки';
UPDATE categories SET icon_name = 'Dices',           color = '#8B5CF6' WHERE name = 'Настолки';
UPDATE categories SET icon_name = 'UtensilsCrossed', color = '#F97316' WHERE name = 'Барбекю';
UPDATE categories SET icon_name = 'Music',           color = '#EC4899' WHERE name = 'Концерты';
UPDATE categories SET icon_name = 'Plane',           color = '#06B6D4' WHERE name = 'Путешествия';
UPDATE categories SET name = 'Інше', icon_name = 'Sparkles', color = '#6B7280' WHERE name = 'Другое';

CREATE TABLE funny_statuses (
  id         serial  PRIMARY KEY,
  label      text    NOT NULL,
  icon_name  text,
  sort_order int     DEFAULT 0,
  is_active  boolean DEFAULT true
);

INSERT INTO funny_statuses (label, icon_name, sort_order) VALUES
  ('Душа компанії',            'PartyPopper',     1),
  ('Найсмішніший',             'Laugh',           2),
  ('Король/королева танцполу', 'Music2',          3),
  ('Найкраще пригостив(-ла)',  'UtensilsCrossed', 4),
  ('Найпунктуальніший',        'Clock',           5),
  ('Фотограф заходу',          'Camera',          6),
  ('Найтихіший',               'VolumeX',         7),
  ('Балакун',                  'MessageCircle',   8);

UPDATE users SET is_admin = true WHERE telegram_id = 540420246;
