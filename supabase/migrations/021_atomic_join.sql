-- ============================================================
-- Приєднання до заходу рахувало кількість accepted-учасників
-- окремим запитом, а потім окремим upsert вставляло нового —
-- без атомарності. Двоє людей, що тиснуть "приєднатись" майже
-- одночасно на останнє вільне місце (або останнє місце за
-- статтю), могли обидва пройти перевірку — max_participants /
-- гендерна квота порушувались. pg_advisory_xact_lock серіалізує
-- конкурентні join-и на той самий захід, а перевірка місць і
-- вставка відбуваються в одній транзакції.
-- ============================================================

CREATE OR REPLACE FUNCTION join_event_atomic(p_event_id uuid, p_user_id uuid, p_gender text)
RETURNS event_participants
LANGUAGE plpgsql
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_existing_status text;
  v_accepted_count int;
  v_quota int;
  v_same_gender_count int;
  v_result event_participants%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_event_id::text));

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  SELECT status INTO v_existing_status
  FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_status IS DISTINCT FROM 'accepted' AND v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_accepted_count
    FROM event_participants WHERE event_id = p_event_id AND status = 'accepted';
    IF v_accepted_count >= v_event.max_participants THEN
      RAISE EXCEPTION 'event_full';
    END IF;
  END IF;

  v_quota := CASE p_gender WHEN 'male' THEN v_event.max_male WHEN 'female' THEN v_event.max_female ELSE NULL END;
  IF v_quota IS NOT NULL THEN
    SELECT count(*) INTO v_same_gender_count
    FROM event_participants ep JOIN users u ON u.id = ep.user_id
    WHERE ep.event_id = p_event_id AND ep.status = 'accepted' AND u.gender = p_gender;
    IF v_same_gender_count >= v_quota THEN
      RAISE EXCEPTION 'gender_quota_full';
    END IF;
  END IF;

  INSERT INTO event_participants (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, 'accepted')
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'accepted'
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;
