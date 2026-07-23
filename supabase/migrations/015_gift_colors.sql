-- ============================================================
-- Колір для кожного подарунка — використовується для градієнтного
-- "сяючого" бейджа замість плоскої сірої іконки на фронтенді.
-- ============================================================

ALTER TABLE gifts_catalog ADD COLUMN color text;

UPDATE gifts_catalog SET color = '#EC4899' WHERE name = 'Квітка';
UPDATE gifts_catalog SET color = '#B45309' WHERE name = 'Кава';
UPDATE gifts_catalog SET color = '#EF4444' WHERE name = 'Серце';
UPDATE gifts_catalog SET color = '#F59E0B' WHERE name = 'Кубок';
UPDATE gifts_catalog SET color = '#8B5CF6' WHERE name = 'Корона';
UPDATE gifts_catalog SET color = '#06B6D4' WHERE name = 'Діамант';
