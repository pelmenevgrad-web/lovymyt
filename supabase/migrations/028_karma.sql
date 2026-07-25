-- ============================================================
-- Карма замінює Stars як нагороду за реферальну програму: Stars
-- прив'язані до реальних грошей (поповнення/подарунки/PRO), тож
-- безкоштовна видача Stars за реферала — це кеш-еквівалент і
-- пряма ціль для накрутки фейковими акаунтами. Карма ні на що
-- не обмінюється — вона лише відкриває пороги можливостей, тому
-- немає сенсу її фармити ботами.
-- ============================================================

ALTER TABLE users ADD COLUMN karma_points int NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION credit_karma_balance(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance int;
BEGIN
  UPDATE users SET karma_points = karma_points + p_amount
  WHERE id = p_user_id
  RETURNING karma_points INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  RETURN new_balance;
END;
$$;
