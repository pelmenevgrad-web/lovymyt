-- ============================================================
-- Ліміт активних заходів для безкоштовного тарифу (2/користувач)
-- рахувався окремим запитом, а потім окремим insert створював
-- захід — без атомарності. Кілька швидких послідовних запитів
-- могли створити 3+ заходи замість 2, обходячи PRO-обмеження.
-- pg_advisory_xact_lock на creator_id серіалізує конкурентні
-- створення заходів тим самим користувачем, а перевірка ліміту
-- і сам insert відбуваються в одній транзакції.
-- ============================================================

CREATE OR REPLACE FUNCTION create_event_atomic(
  p_creator_id uuid, p_is_pro boolean, p_free_limit int,
  p_category_id int, p_title text, p_description text, p_address_text text,
  p_start_time timestamptz, p_lat double precision, p_lng double precision, p_end_time timestamptz,
  p_duration_min_hours numeric, p_max_participants int, p_min_participants int,
  p_budget_type text, p_budget_amount numeric, p_age_min int, p_age_max int,
  p_allowed_gender text, p_max_male int, p_max_female int,
  p_radius_visibility text, p_conditions jsonb, p_cover_image_url text
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_active_count int;
  v_new_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(p_creator_id::text));

  IF NOT p_is_pro THEN
    SELECT count(*) INTO v_active_count FROM events
    WHERE creator_id = p_creator_id AND status IN ('planned', 'gathering', 'active');
    IF v_active_count >= p_free_limit THEN
      RAISE EXCEPTION 'event_limit_reached';
    END IF;
  END IF;

  INSERT INTO events (
    creator_id, category_id, title, description, address_text,
    start_time, lat, lng, end_time, duration_min_hours,
    max_participants, min_participants, budget_type, budget_amount,
    age_min, age_max, allowed_gender, max_male, max_female,
    radius_visibility, conditions, cover_image_url
  ) VALUES (
    p_creator_id, p_category_id, p_title, p_description, p_address_text,
    p_start_time, p_lat, p_lng, p_end_time, p_duration_min_hours,
    p_max_participants, p_min_participants, p_budget_type::budget_type_enum, p_budget_amount,
    p_age_min, p_age_max, p_allowed_gender, p_max_male, p_max_female,
    p_radius_visibility::radius_visibility_enum, p_conditions, p_cover_image_url
  ) RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
