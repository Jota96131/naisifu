---
status: draft
tags: Supabase, Next.js, RLS, 個人開発, 初心者
twitter: |
  Supabaseで「読み込み中…」が無限に続いて詰んだ時の話を書きました。
  RLSを有効化しただけだとアクセス全拒否がデフォルト、というのを知らずに数時間溶かしました。
  #Supabase #個人開発
  [ここにQiitaのURLを貼る]
---

# 【Supabase】`406 (Not Acceptable)` でデータが取れない → RLSポリシー未設定だった話

## はじめに

個人開発のシフト管理アプリで、ページが「読み込み中…」のまま動かない事象に遭遇しました。
原因は **Supabase の RLS（Row Level Security）ポリシー未設定** でした。

## 結論

RLSを有効化したら、**SELECTポリシーを必ず作らないとデータが1件も返らない**。

```sql
CREATE POLICY "staff can read own store"
ON stores FOR SELECT TO authenticated
USING (
  id IN (SELECT store_id FROM staff WHERE email = auth.jwt() ->> 'email')
);
```

## 起きたこと

ログイン後の画面で、ずっと「読み込み中…」のまま。
DevToolsを開くと、Supabaseへのリクエストが **406 Not Acceptable** を返していた。

```
GET /rest/v1/stores?select=...&id=eq.xxx 406 (Not Acceptable)
```

データはちゃんとテーブルに入っているのに、なぜ取れないのか分からなかった。

## 原因

Supabase でテーブルに対して **RLSを有効化** していたが、**SELECTポリシーを作っていなかった**。

RLSの仕様は **「ポリシーなし＝全拒否」** がデフォルト。「有効化したけどポリシー未設定」だと、誰もそのテーブルを読めない状態になる。

## 解決手順

Supabase Dashboard → Authentication → Policies で対象テーブルに以下を追加：

```sql
CREATE POLICY "staff can read own store"
ON stores FOR SELECT TO authenticated
USING (
  id IN (SELECT store_id FROM staff WHERE email = auth.jwt() ->> 'email')
);
```

「ログイン中のユーザーが所属する店舗だけ読み取れる」という条件を `USING` に書く。

## なぜそうなる仕組みなのか

RLSは **「セキュアバイデフォルト」** の思想で設計されている。

- RLSを**無効**にした状態 → 誰でも全データにアクセスできる（危ない）
- RLSを**有効**にしてポリシーなし → 誰もアクセスできない（安全側に倒れる）
- ポリシーを書いて初めて「特定の条件のユーザーだけ通す」が実現

「セキュリティ機能を有効にしたら、明示的に許可しない限り何も通さない」という考え方。

## 学び

- RLSを有効化したら、**操作ごと（SELECT / INSERT / UPDATE / DELETE）にポリシーが必要**
- 「データはあるのに取れない」 → まずRLS疑う
- 406エラーは「テーブルは存在するけど権限で弾かれた」のサイン
