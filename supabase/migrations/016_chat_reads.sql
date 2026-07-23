-- ============================================================
-- Відмітка "прочитано" для чату заходу — використовується для
-- реального бейджа непрочитаних повідомлень у нижньому меню
-- (замість захардкодженого hasUnreadChats = true).
-- ============================================================

CREATE TABLE chat_reads (
  event_id     uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
