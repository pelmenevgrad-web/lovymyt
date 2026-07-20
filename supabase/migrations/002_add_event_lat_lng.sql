-- ============================================================
-- Добавляет обычные numeric-колонки lat/lng к events.
-- PostGIS geography(location) остаётся для будущего геопошуку,
-- але поки що бекенд працює через прості REST-запити (без RPC/SQL),
-- тож дублюємо координати у вигляді plain double precision.
-- ============================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE events ADD COLUMN IF NOT EXISTS lng double precision;
