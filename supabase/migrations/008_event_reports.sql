-- ============================================================
-- Звіти про завершені заходи — коментарі та фото від учасників,
-- з можливістю приховати запис організатором (проста модерація).
-- ============================================================

CREATE TABLE event_reports (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_id   uuid        REFERENCES users(id) ON DELETE SET NULL,
  text        text,
  image_url   text,
  is_hidden   boolean     DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  CHECK (text IS NOT NULL OR image_url IS NOT NULL)
);

CREATE INDEX idx_event_reports_event ON event_reports (event_id, created_at);
