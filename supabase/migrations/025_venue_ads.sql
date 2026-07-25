-- ============================================================
-- Реклама локацій: власник локації (альтанки, майданчики тощо)
-- створює оголошення, адмін модерує безкоштовно (approve/reject),
-- і тільки ПІСЛЯ підтвердження власник платить Stars за показ на
-- обраний тариф (тривалість + радіус). Окремий легкий чат-тред
-- між організатором заходу і власником локації (venue_inquiries /
-- venue_messages) — свідомо НЕ event_chats/chat_messages, щоб не
-- чіпати робочу інфраструктуру чату заходів.
--
-- Безпечно виконувати ALTER TYPE ... ADD VALUE в одному файлі з
-- CREATE TABLE нижче: Postgres забороняє лише ВИКОРИСТАННЯ
-- (порівняння/каст/INSERT) нового значення enum у тій самій
-- транзакції, де воно додане — а жоден CREATE TABLE нижче не
-- посилається на значення 'venue_activation' (venues.status і
-- venues.tier — звичайний text з CHECK, не enum, за прикладом
-- verification_requests.status). Реальний INSERT з
-- type:'venue_activation' станеться пізніше, в окремому
-- з'єднанні бекенда. Порівняй з 023/024: там 024 реально пише
-- 'waitlisted'::participant_status_enum усередині тіла функції,
-- створюваної в тому ж файлі — ось що вимагало розділення.
-- ============================================================

ALTER TYPE stars_tx_type_enum ADD VALUE IF NOT EXISTS 'venue_activation';

CREATE TABLE venues (
  id            uuid             PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id      uuid             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         text             NOT NULL,
  description   text,
  address_text  text             NOT NULL,
  lat           double precision NOT NULL,
  lng           double precision NOT NULL,
  photo_url     text             NOT NULL,
  price_info    text,
  status        text             NOT NULL DEFAULT 'pending',
  reject_reason text,
  reviewed_by   uuid             REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at   timestamptz,
  tier          text,
  radius_km     numeric(5,1),
  active_until  timestamptz,
  created_at    timestamptz      DEFAULT now(),
  CONSTRAINT venues_status_check CHECK (status IN ('pending', 'approved', 'rejected')),
  CONSTRAINT venues_tier_check   CHECK (tier IS NULL OR tier IN ('basic', 'standard', 'premium'))
);

CREATE INDEX idx_venues_status ON venues (status);
CREATE INDEX idx_venues_active ON venues (status, active_until);
CREATE INDEX idx_venues_owner  ON venues (owner_id);

CREATE TABLE venue_inquiries (
  id           uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  venue_id     uuid        NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  organizer_id uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (venue_id, organizer_id)
);

CREATE TABLE venue_messages (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id uuid        NOT NULL REFERENCES venue_inquiries(id) ON DELETE CASCADE,
  sender_id  uuid        REFERENCES users(id) ON DELETE SET NULL,
  text       text,
  image_url  text,
  is_system  boolean     DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT venue_messages_text_or_image CHECK (text IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX idx_venue_messages_inquiry ON venue_messages (inquiry_id, created_at);
