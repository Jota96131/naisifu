-- ============================================
-- store_code の生成関数を、紛らわしい文字を除外する版に差し替える
-- 除外: 0/O, 1/I/L
-- 採用文字種: 23456789ABCDEFGHJKMNPQRSTUVWXYZ (31文字)
-- ============================================

CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || SUBSTRING(chars FROM (1 + FLOOR(RANDOM() * LENGTH(chars))::INT) FOR 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
