-- ============================================================
-- Організатор після заходу відмічає, хто не з'явився — використовується
-- для розрахунку "Надійності" в профілі (замість мертвої users.no_show_count).
-- ============================================================

CREATE TABLE event_no_shows (
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  marked_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
