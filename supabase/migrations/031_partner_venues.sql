-- ============================================================
-- "Стати партнером" — категорії типів локацій (готель, альтанки,
-- гольф-поле тощо), окрема таксономія від подієвих categories (типи
-- активності не перетинаються з типами закладів). Нові тарифи
-- активації (тиждень/місяць, замінюють basic/standard/premium —
-- таблиця venues ще порожня, дані мігрувати нема чого) і можливість
-- автопродовження зі внутрішнього балансу Stars.
-- ============================================================

CREATE TABLE venue_categories (
  id         serial  PRIMARY KEY,
  name       text    NOT NULL,
  icon_name  text,
  color      text,
  sort_order int     DEFAULT 0,
  is_active  boolean DEFAULT true
);

INSERT INTO venue_categories (name, icon_name, color, sort_order) VALUES
  ('Готель',               'Building2', '#3B82F6', 1),
  ('Альтанки/Мангал',      'Flame',     '#F97316', 2),
  ('Гольф-поле',           'Flag',      '#22C55E', 3),
  ('Ресторан/Кафе',        'ChefHat',   '#EC4899', 4),
  ('Пляж/Прокат',          'Waves',     '#06B6D4', 5),
  ('Спортивний майданчик', 'Dumbbell',  '#8B5CF6', 6),
  ('Інше',                 'Sparkles',  '#6B7280', 7);

ALTER TABLE venues ADD COLUMN category_id int REFERENCES venue_categories(id);
ALTER TABLE venues ADD COLUMN auto_renew boolean NOT NULL DEFAULT false;

ALTER TABLE venues DROP CONSTRAINT venues_tier_check;
ALTER TABLE venues ADD CONSTRAINT venues_tier_check CHECK (tier IS NULL OR tier IN ('week', 'month'));
