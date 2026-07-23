-- ============================================================
-- Заявки на верифікацію — користувач надсилає фото + опис,
-- адмін підтверджує/відхиляє. is_verified лишається на users,
-- тут лише історія заявок і причина відхилення.
-- ============================================================

CREATE TABLE verification_requests (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url     text        NOT NULL,
  note          text,
  status        text        NOT NULL DEFAULT 'pending',
  reject_reason text,
  reviewed_by   uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now(),
  reviewed_at   timestamptz
);

CREATE INDEX idx_verification_requests_status ON verification_requests (status, created_at);
