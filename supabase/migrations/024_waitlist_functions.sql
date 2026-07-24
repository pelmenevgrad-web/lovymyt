-- ============================================================
-- Виконувати ПІСЛЯ 023_waitlist_enum.sql.
--
-- join_event_atomic оновлено: коли не вистачає загального місця
-- або гендерної квоти, замість помилки людина стає 'waitlisted'
-- (замість event_full/gender_quota_full винятків).
--
-- promote_from_waitlist_atomic: викликається після leave/decline
-- або збільшення max_participants — просуває найдовше очікуючого
-- учасника (з урахуванням гендерної квоти) на звільнене місце.
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
  v_target_status text;
  v_result event_participants%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_event_id::text));

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'event_not_found';
  END IF;

  SELECT status INTO v_existing_status
  FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id;

  IF v_existing_status = 'accepted' THEN
    SELECT * INTO v_result FROM event_participants WHERE event_id = p_event_id AND user_id = p_user_id;
    RETURN v_result;
  END IF;

  v_target_status := 'accepted';

  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_accepted_count
    FROM event_participants WHERE event_id = p_event_id AND status = 'accepted';
    IF v_accepted_count >= v_event.max_participants THEN
      v_target_status := 'waitlisted';
    END IF;
  END IF;

  IF v_target_status = 'accepted' THEN
    v_quota := CASE p_gender WHEN 'male' THEN v_event.max_male WHEN 'female' THEN v_event.max_female ELSE NULL END;
    IF v_quota IS NOT NULL THEN
      SELECT count(*) INTO v_same_gender_count
      FROM event_participants ep JOIN users u ON u.id = ep.user_id
      WHERE ep.event_id = p_event_id AND ep.status = 'accepted' AND u.gender = p_gender;
      IF v_same_gender_count >= v_quota THEN
        v_target_status := 'waitlisted';
      END IF;
    END IF;
  END IF;

  INSERT INTO event_participants (event_id, user_id, status)
  VALUES (p_event_id, p_user_id, v_target_status::participant_status_enum)
  ON CONFLICT (event_id, user_id) DO UPDATE SET status = v_target_status::participant_status_enum
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION promote_from_waitlist_atomic(p_event_id uuid)
RETURNS event_participants
LANGUAGE plpgsql
AS $$
DECLARE
  v_event events%ROWTYPE;
  v_accepted_count int;
  v_quota int;
  v_same_gender_count int;
  v_candidate record;
  v_result event_participants%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_event_id::text));

  SELECT * INTO v_event FROM events WHERE id = p_event_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_event.max_participants IS NOT NULL THEN
    SELECT count(*) INTO v_accepted_count
    FROM event_participants WHERE event_id = p_event_id AND status = 'accepted';
    IF v_accepted_count >= v_event.max_participants THEN
      RETURN NULL;
    END IF;
  END IF;

  FOR v_candidate IN
    SELECT ep.id, u.gender AS user_gender
    FROM event_participants ep JOIN users u ON u.id = ep.user_id
    WHERE ep.event_id = p_event_id AND ep.status = 'waitlisted'
    ORDER BY ep.joined_at ASC
  LOOP
    v_quota := CASE v_candidate.user_gender WHEN 'male' THEN v_event.max_male WHEN 'female' THEN v_event.max_female ELSE NULL END;
    IF v_quota IS NOT NULL THEN
      SELECT count(*) INTO v_same_gender_count
      FROM event_participants ep2 JOIN users u2 ON u2.id = ep2.user_id
      WHERE ep2.event_id = p_event_id AND ep2.status = 'accepted' AND u2.gender = v_candidate.user_gender;
      IF v_same_gender_count >= v_quota THEN
        CONTINUE;
      END IF;
    END IF;

    UPDATE event_participants SET status = 'accepted' WHERE id = v_candidate.id RETURNING * INTO v_result;
    RETURN v_result;
  END LOOP;

  RETURN NULL;
END;
$$;
