-- ============================================================
-- Подарунки між користувачами за Stars — робимо gifts_catalog
-- адмін-редагованим (icon_name/is_active/sort_order, як categories
-- та funny_statuses), і додаємо стартовий набір подарунків.
-- Stars, витрачені на подарунок, переходять на баланс отримувача
-- (likes_gifts.stars_amount + парні записи в stars_transactions).
-- ============================================================

ALTER TABLE gifts_catalog ADD COLUMN icon_name text;
ALTER TABLE gifts_catalog ADD COLUMN is_active boolean DEFAULT true;
ALTER TABLE gifts_catalog ADD COLUMN sort_order int DEFAULT 0;

INSERT INTO gifts_catalog (name, icon_name, price_stars, sort_order) VALUES
  ('Квітка',  'Flower',  10,  1),
  ('Кава',    'Coffee',  15,  2),
  ('Серце',   'Heart',   25,  3),
  ('Кубок',   'Trophy',  50,  4),
  ('Корона',  'Crown',   150, 5),
  ('Діамант', 'Gem',     500, 6);
