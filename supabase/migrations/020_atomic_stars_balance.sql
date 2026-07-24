-- ============================================================
-- stars_balance змінювався через "прочитати, потім записати нове
-- число" — під двома майже одночасними запитами (напр. два
-- подарунки поспіль) обидва читають той самий застарілий баланс,
-- і другий запис затирає перший, даючи безкоштовні Stars.
-- Атомарні функції рахують на рівні БД, під захистом рядкового
-- локу самого UPDATE, тож гонки більше немає.
-- ============================================================

CREATE OR REPLACE FUNCTION credit_stars_balance(p_user_id uuid, p_amount int)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance int;
BEGIN
  UPDATE users SET stars_balance = stars_balance + p_amount
  WHERE id = p_user_id
  RETURNING stars_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  RETURN new_balance;
END;
$$;

-- p_floor_zero: true clamps at 0 instead of raising (used for admin
-- refunds, which shouldn't fail even if the user has since spent below
-- the refunded amount).
CREATE OR REPLACE FUNCTION debit_stars_balance(p_user_id uuid, p_amount int, p_floor_zero boolean DEFAULT false)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
  new_balance int;
BEGIN
  IF p_floor_zero THEN
    UPDATE users SET stars_balance = GREATEST(0, stars_balance - p_amount)
    WHERE id = p_user_id
    RETURNING stars_balance INTO new_balance;
  ELSE
    UPDATE users SET stars_balance = stars_balance - p_amount
    WHERE id = p_user_id AND stars_balance >= p_amount
    RETURNING stars_balance INTO new_balance;

    IF new_balance IS NULL THEN
      RAISE EXCEPTION 'insufficient_balance';
    END IF;
  END IF;

  RETURN new_balance;
END;
$$;
