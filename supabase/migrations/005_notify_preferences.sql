-- ============================================================
-- Налаштування сповіщень про нові заходи: або радіус навколо
-- "домашньої" точки користувача, або "про все і скрізь".
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_lat double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_lng double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_radius_km numeric(6,1);
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_all_events boolean DEFAULT false;
