-- ============================================================
-- ЛовиМить — начальная схема БД
-- Требует: PostgreSQL + PostGIS
-- ============================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ENUMs
-- ────────────────────────────────────────────────────────────

CREATE TYPE radius_visibility_enum AS ENUM ('public', 'accepted_only');
CREATE TYPE event_status_enum      AS ENUM ('planned', 'gathering', 'active', 'completed', 'cancelled');
CREATE TYPE budget_type_enum       AS ENUM ('each_pays', 'shared', 'free');
CREATE TYPE participant_status_enum AS ENUM ('invited', 'requested', 'accepted', 'declined', 'left');
CREATE TYPE like_gift_type_enum    AS ENUM ('like', 'gift');
CREATE TYPE stars_tx_type_enum     AS ENUM ('topup', 'pro_purchase', 'gift_sent', 'gift_received');

-- ────────────────────────────────────────────────────────────
-- categories
-- ────────────────────────────────────────────────────────────

CREATE TABLE categories (
  id         serial  PRIMARY KEY,
  name       text    NOT NULL,
  icon       text,
  sort_order int     DEFAULT 0
);

INSERT INTO categories (name, icon, sort_order) VALUES
  ('Спорт',        '⚽', 1),
  ('Прогулки',     '🚶', 2),
  ('Настолки',     '🎲', 3),
  ('Барбекю',      '🍖', 4),
  ('Концерты',     '🎵', 5),
  ('Путешествия',  '✈️',  6),
  ('Другое',       '✨', 99);

-- ────────────────────────────────────────────────────────────
-- users
-- ────────────────────────────────────────────────────────────

CREATE TABLE users (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id           bigint      UNIQUE NOT NULL,
  username              text,
  first_name            text,
  avatar_url            text,
  bio                   text,
  birth_date            date,
  is_verified           boolean     DEFAULT false,
  rating_avg            numeric(3,2) DEFAULT 0,
  rating_count          int         DEFAULT 0,
  events_created_count  int         DEFAULT 0,
  events_joined_count   int         DEFAULT 0,
  no_show_count         int         DEFAULT 0,
  is_pro                boolean     DEFAULT false,
  pro_expires_at        timestamptz,
  stars_balance         int         DEFAULT 0,
  created_at            timestamptz DEFAULT now(),
  last_active_at        timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- events
-- (chat_id добавляется после event_chats, чтобы избежать
--  forward-reference без deferred constraints)
-- ────────────────────────────────────────────────────────────

CREATE TABLE events (
  id                 uuid                   PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id         uuid                   REFERENCES users(id) ON DELETE SET NULL,
  category_id        int                    REFERENCES categories(id),
  title              text                   NOT NULL,
  description        text,
  location           geography(Point, 4326),
  address_text       text,
  radius_visibility  radius_visibility_enum DEFAULT 'public',
  start_time         timestamptz            NOT NULL,
  end_time           timestamptz,
  status             event_status_enum      DEFAULT 'planned',
  max_participants   int,
  min_participants   int                    DEFAULT 2,
  budget_type        budget_type_enum       DEFAULT 'free',
  budget_amount      numeric(10,2),
  age_min            int,
  age_max            int,
  conditions         jsonb                  DEFAULT '{}',
  chat_id            uuid,                  -- FK добавляется ниже
  created_at         timestamptz            DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- event_chats
-- ────────────────────────────────────────────────────────────

CREATE TABLE event_chats (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   uuid        UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE events
  ADD CONSTRAINT fk_events_chat
  FOREIGN KEY (chat_id) REFERENCES event_chats(id) ON DELETE SET NULL;

-- ────────────────────────────────────────────────────────────
-- chat_messages
-- ────────────────────────────────────────────────────────────

CREATE TABLE chat_messages (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id    uuid        NOT NULL REFERENCES event_chats(id) ON DELETE CASCADE,
  sender_id  uuid        REFERENCES users(id) ON DELETE SET NULL,
  text       text        NOT NULL,
  is_system  boolean     DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- event_participants
-- ────────────────────────────────────────────────────────────

CREATE TABLE event_participants (
  id         uuid                    PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id   uuid                    NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid                    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status     participant_status_enum DEFAULT 'requested',
  joined_at  timestamptz             DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- reviews
-- ────────────────────────────────────────────────────────────

CREATE TABLE reviews (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id     uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  from_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  to_user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       int         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (event_id, from_user_id, to_user_id)
);

-- ────────────────────────────────────────────────────────────
-- gifts_catalog
-- ────────────────────────────────────────────────────────────

CREATE TABLE gifts_catalog (
  id                 serial PRIMARY KEY,
  name               text   NOT NULL,
  icon_animated_url  text,
  price_stars        int    NOT NULL CHECK (price_stars > 0)
);

-- ────────────────────────────────────────────────────────────
-- likes_gifts
-- ────────────────────────────────────────────────────────────

CREATE TABLE likes_gifts (
  id           uuid               PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_user_id uuid               REFERENCES users(id) ON DELETE SET NULL,
  to_user_id   uuid               NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id     uuid               REFERENCES events(id) ON DELETE SET NULL,
  type         like_gift_type_enum NOT NULL,
  gift_id      int                REFERENCES gifts_catalog(id),
  stars_amount int                DEFAULT 0,
  created_at   timestamptz        DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- stars_transactions
-- ────────────────────────────────────────────────────────────

CREATE TABLE stars_transactions (
  id                        uuid              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   uuid              NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                      stars_tx_type_enum NOT NULL,
  amount                    int               NOT NULL,
  telegram_payment_charge_id text,
  created_at                timestamptz       DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- reports
-- ────────────────────────────────────────────────────────────

CREATE TABLE reports (
  id             uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       uuid        REFERENCES events(id) ON DELETE SET NULL,
  from_user_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  target_user_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason         text        NOT NULL,
  status         text        DEFAULT 'pending',
  created_at     timestamptz DEFAULT now()
);

-- ────────────────────────────────────────────────────────────
-- Индексы
-- ────────────────────────────────────────────────────────────

-- Геопоиск по координатам мероприятий (обязателен)
CREATE INDEX idx_events_location
  ON events USING GIST (location);

-- Фильтрация участников по статусу внутри мероприятия
CREATE INDEX idx_event_participants_event_status
  ON event_participants (event_id, status);

-- Фильтрация мероприятий по статусу и времени
CREATE INDEX idx_events_status_start
  ON events (status, start_time);

-- История сообщений в чате
CREATE INDEX idx_chat_messages_chat_created
  ON chat_messages (chat_id, created_at);

-- ────────────────────────────────────────────────────────────
-- Триггер: пересчёт рейтинга пользователя при новом отзыве
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_update_user_rating()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE users
  SET
    rating_avg   = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE to_user_id = NEW.to_user_id),
    rating_count = (SELECT COUNT(*)                        FROM reviews WHERE to_user_id = NEW.to_user_id)
  WHERE id = NEW.to_user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_user_rating
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE FUNCTION fn_update_user_rating();
