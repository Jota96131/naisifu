-- ============================================
-- stores テーブルに store_code カラムを追加
-- ============================================

-- 1. store_code カラムを追加（一意制約付き）
ALTER TABLE stores
  ADD COLUMN store_code TEXT UNIQUE;

-- 2. 既存レコードに 8 文字のランダムコードを発行
--    例: "A3F9K2L7"
UPDATE stores
SET store_code = UPPER(
  SUBSTRING(
    REGEXP_REPLACE(
      ENCODE(gen_random_bytes(6), 'base64'),
      '[^A-Za-z0-9]', '', 'g'
    )
    FROM 1 FOR 8
  )
)
WHERE store_code IS NULL;

-- 3. 今後の新規店舗は自動でコード発行されるようデフォルト関数を設定
CREATE OR REPLACE FUNCTION generate_store_code()
RETURNS TEXT AS $$
BEGIN
  RETURN UPPER(
    SUBSTRING(
      REGEXP_REPLACE(
        ENCODE(gen_random_bytes(6), 'base64'),
        '[^A-Za-z0-9]', '', 'g'
      )
      FROM 1 FOR 8
    )
  );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE stores
  ALTER COLUMN store_code SET DEFAULT generate_store_code();

-- 4. NOT NULL 制約を追加
ALTER TABLE stores
  ALTER COLUMN store_code SET NOT NULL;

-- ============================================
-- 確認用 SELECT（実行後に結果を確認）
-- ============================================
SELECT id, name, store_code FROM stores;
