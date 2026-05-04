-- girls.line_user_id に UNIQUE 制約を追加（NULL は複数許容）
-- 同じLINEユーザーが複数のgirlに紐付くのを防ぐため、部分インデックスでUNIQUEを保証する。
-- NULL（未紐付け）は何行あってもOK。
CREATE UNIQUE INDEX IF NOT EXISTS girls_line_user_id_unique
  ON girls (line_user_id)
  WHERE line_user_id IS NOT NULL;
