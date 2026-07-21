-- ============================================================
-- Список необхідного для заходу (наприклад: вугілля, дрова, вода)
-- та заявки учасників на те, скільки вони принесуть.
-- ============================================================

CREATE TABLE event_supplies (
  id             uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id       uuid          NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name           text          NOT NULL,
  needed_amount  numeric(10,2) NOT NULL CHECK (needed_amount > 0),
  unit           text,
  created_at     timestamptz   DEFAULT now()
);

CREATE TABLE event_supply_claims (
  id          uuid          PRIMARY KEY DEFAULT uuid_generate_v4(),
  supply_id   uuid          NOT NULL REFERENCES event_supplies(id) ON DELETE CASCADE,
  user_id     uuid          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      numeric(10,2) NOT NULL CHECK (amount > 0),
  created_at  timestamptz   DEFAULT now(),
  UNIQUE (supply_id, user_id)
);

CREATE INDEX idx_event_supplies_event ON event_supplies (event_id);
CREATE INDEX idx_event_supply_claims_supply ON event_supply_claims (supply_id);
