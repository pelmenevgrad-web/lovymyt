-- ============================================================
-- Клуби: регулярні заходи (напр. "Волейбол щочетверга"). Організатор
-- створює клуб один раз, люди підписуються один раз, і кожен новий
-- випуск (звичайний events-рядок з club_id) автоматично сповіщає
-- підписників — без пересоздання заходу і втрати аудиторії щотижня.
-- ============================================================

CREATE TABLE clubs (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title           text        NOT NULL,
  description     text,
  category_id     int         REFERENCES categories(id),
  cover_image_url text,
  weekday         int         CHECK (weekday BETWEEN 0 AND 6), -- 0=Нд..6=Сб, nullable
  time_of_day     text,       -- 'HH:MM', nullable
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_clubs_creator ON clubs (creator_id);

CREATE TABLE club_subscribers (
  club_id       uuid        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subscribed_at timestamptz DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);

ALTER TABLE events ADD COLUMN club_id uuid REFERENCES clubs(id) ON DELETE SET NULL;
