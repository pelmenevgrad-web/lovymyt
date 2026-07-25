-- ============================================================
-- Баттли: організатор одного активного заходу викликає організатора
-- іншого — "у кого крутіший захід". Суперник має прийняти виклик,
-- після чого баттл стає публічним: глядачі голосують за сторону
-- (один голос на юзера) і донатять Stars у призовий фонд, який
-- виплачується переможцю (за кількістю голосів) коли баттл завершується.
-- ============================================================

CREATE TYPE battle_status_enum AS ENUM ('pending', 'active', 'completed', 'declined', 'cancelled');

CREATE TABLE battles (
  id                  uuid                PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenger_event_id uuid                NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  opponent_event_id   uuid                NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  challenger_id       uuid                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  opponent_id         uuid                NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              battle_status_enum  NOT NULL DEFAULT 'pending',
  prize_pool          int                 NOT NULL DEFAULT 0,
  winner_id           uuid                REFERENCES users(id),
  ends_at             timestamptz,
  created_at          timestamptz         DEFAULT now()
);
CREATE INDEX idx_battles_challenger ON battles (challenger_id);
CREATE INDEX idx_battles_opponent ON battles (opponent_id);
CREATE INDEX idx_battles_status ON battles (status);

-- Один голос на глядача за баттл; зміна голосу — це UPSERT (ON CONFLICT),
-- не нова стрічка.
CREATE TABLE battle_votes (
  battle_id  uuid        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  voter_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  side_id    uuid        NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (battle_id, voter_id)
);

CREATE TABLE battle_donations (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id  uuid        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  donor_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  side_id    uuid        NOT NULL REFERENCES users(id),
  amount     int         NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_battle_donations_battle ON battle_donations (battle_id);

CREATE TABLE battle_posts (
  id         uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  battle_id  uuid        NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  side_id    uuid        NOT NULL REFERENCES users(id),
  media_url  text        NOT NULL,
  media_type text        NOT NULL DEFAULT 'photo' CHECK (media_type IN ('photo', 'video')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_battle_posts_battle ON battle_posts (battle_id);

-- Атомарний інкремент призового фонду (той самий патерн, що й
-- credit_stars_balance / credit_wave_balance) — без цього два майже
-- одночасні донати могли б затерти один одного.
CREATE OR REPLACE FUNCTION add_battle_prize(p_battle_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_total int;
BEGIN
  UPDATE battles SET prize_pool = prize_pool + p_amount
  WHERE id = p_battle_id
  RETURNING prize_pool INTO new_total;

  IF new_total IS NULL THEN
    RAISE EXCEPTION 'battle_not_found';
  END IF;

  RETURN new_total;
END;
$$;
