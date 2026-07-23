-- ============================================================
-- Дозволяємо позначати захід декількома категоріями одразу
-- (наприклад, пікнік на концерті, футбол з барбекю).
-- events.category_id лишається як "основна" (перша обрана) категорія —
-- використовується там, де потрібна саме одна іконка (мітка на карті).
-- ============================================================

CREATE TABLE event_categories (
  event_id    uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  category_id int  NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, category_id)
);

INSERT INTO event_categories (event_id, category_id)
SELECT id, category_id FROM events WHERE category_id IS NOT NULL;
