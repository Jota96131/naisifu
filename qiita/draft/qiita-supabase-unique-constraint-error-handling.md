---
status: draft
tags: Supabase, PostgreSQL, Next.js, エラーハンドリング, 個人開発
twitter: |
  「DB側のUNIQUE制約」と「アプリ側のエラーハンドリング」はセットで初めて完成する話を書きました。
  片方だけだと「重複は防げるけどユーザーには『Internal Server Error』しか見えない」状態になります。
  #Supabase #個人開発
  [ここにQiitaのURLを貼る]
---

# 【Supabase】UNIQUE制約は「壁」、エラーハンドリングは「壁にぶつかった人への張り紙」 — セットで初めて完成する話

## はじめに

LINE連携アプリで「同じLINEアカウントが複数人に紐付いてしまう」バグを直す過程で、**DB制約とアプリ層のエラーハンドリングの関係**を理解しました。

「DBに UNIQUE 制約を貼ったから安心」と思いがちですが、それだけだとユーザー体験は最悪のままです。

## 結論

| やる側 | 役割 |
|---|---|
| **DBの UNIQUE 制約** | 重複データを**物理的に防ぐ**警備員 |
| **アプリのエラーハンドリング** | 警備員が止めた時の**説明メッセージ**を整える張り紙 |

**両方揃って初めて「重複登録できないし、なぜダメかユーザーにも伝わる」状態になる。**

## 起きていたこと

LINE連携アプリで、こういうバグが起きていました。

```
登録ボタン押す
  ↓
DB「ダメ！（UNIQUE違反）」
  ↓
画面「Internal Server Error」
```

ユーザー視点では「なんで失敗したのか全然わからん」状態。お店に「登録できない」とクレームが来るレベル。

## 修正① DBに UNIQUE 制約を貼る（Supabase migration）

`girls.line_user_id` カラムに UNIQUE 制約を追加。
ただし `NULL`（未紐付け）は何行あっても OK にしたいので、Postgres の **部分インデックス**を使う:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS girls_line_user_id_unique
  ON girls (line_user_id)
  WHERE line_user_id IS NOT NULL;
```

意味:
> 「`line_user_id` が NULL じゃない行**だけ**を対象に、UNIQUE を保証する」

これで:
- NULL は何行あっても OK（紐付け前の行は複数 OK）
- NULL 以外は重複 NG（同じ LINE を 2 人に紐付けるのを拒否）

## 修正② アプリ層でエラーコードをハンドリング

### Before（Internal Server Error が返る）

```ts
const { data, error } = await supabaseAdmin
  .from("girls")
  .update({ line_user_id: userId })
  .eq("id", girlId)
  .is("line_user_id", null)
  .select();

if (error) {
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
  });
}
```

これだと UNIQUE 違反でもただの 500 エラーが返るだけ。ユーザーには「サーバーが死んでます」みたいなメッセージしか見えない。

### After（UNIQUE違反だけ409で返す）

```ts
if (error) {
  // 23505 = PostgresのUNIQUE違反
  if (error.code === "23505") {
    return new Response(
      JSON.stringify({
        error: "このLINEアカウントは既に別の女の子で登録されています。お店に確認してください。",
      }),
      { status: 409 },
    );
  }
  return new Response(JSON.stringify({ error: error.message }), {
    status: 500,
  });
}
```

**ポイントは `error.code === "23505"`**。これは Postgres が UNIQUE 違反時に必ず付ける**世界共通のエラーコード**。

| コード | 意味 |
|---|---|
| 23505 | UNIQUE 違反 |
| 23503 | 外部キー違反 |
| 23502 | NOT NULL 違反 |

なので「このエラーコードだけ特別扱い」っていう分岐が安全に書ける。

## なぜ片方だけだとダメなのか

### DB制約だけある場合
- 重複は防げる ✅
- でもユーザーには `Internal Server Error` しか見えない ❌
- 「何度も連打する」「お店にクレーム」が起きる

### アプリ層のチェックだけある場合
- 「すでに登録されているか?」を SELECT で先に確認 → なければ INSERT/UPDATE
- でも**チェックと書き込みの間に他のリクエストが入り込む可能性**（race condition）
- DBレベルでガードしないと、結局重複が発生し得る

### 両方あると
- DB が物理的にガード（race conditionでも安全）
- アプリ層がエラーを翻訳して人間が読めるメッセージに変換
- ユーザー体験 ◎

## 学び

- **DB制約は「壁」**、**アプリのエラーハンドリングは「壁の前の張り紙」**
- 片方だけだと「動くけど不親切」or「親切だけど穴がある」になる
- Postgres のエラーコードを覚えとくと、特定のエラーだけハンドリングできて便利
- 「未連携=NULL」を許容したいなら部分インデックス（`WHERE ... IS NOT NULL`）が定番

「Supabase で重複防ぎたい」って時、UNIQUE 制約を貼るだけで終わらせず、アプリ側でも `error.code` を見て適切なメッセージを返すところまでセットでやるのがおすすめです。
