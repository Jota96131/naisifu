---
status: draft
tags: Next.js, Supabase, RLS, 個人開発, 初心者
twitter: |
  「Cannot read properties of null (reading 'store_id')」の原因と解決策を書きました。
  認証は通ってるのにデータが表示されない時、DBのテーブル設計を確認しよう。
  #Nextjs #Supabase #個人開発
  [ここにQiitaのURLを貼る]
---

# Cannot read properties of null (reading 'store_id')

## はじめに

個人開発でキャバクラの店舗管理アプリを作っています。Next.js + Supabaseの構成です。
ログインは成功するのに、ページを開くと画面が「読み込み中...」のまま止まる、もしくはエラーが出る現象に遭遇しました。

---

## エラーの内容

ブラウザのコンソールに以下のエラーが表示されました。

```
Runtime TypeError
Cannot read properties of null (reading 'store_id')

app/shifts/page.tsx (54:41) @ ShiftsPage.useEffect.fetchShifts
```

該当のコード：

```tsx
const { data: staffData } = await supabase
  .from("staff")
  .select("store_id")
  .eq("email", user.email)
  .single();

// ここでエラー
const { data } = await supabase
  .from("shifts")
  .select("*")
  .eq("store_id", staffData.store_id);  // staffData が null
```

---

## 原因

**staffテーブルにログイン中のユーザーのemailが登録されていなかった。**

このアプリでは、以下の流れでデータを取得しています。

```
① supabase.auth.getUser() → ログインユーザーのemail取得
② staffテーブルでemailを検索 → store_id を取得
③ store_id を使って、自分の店舗のデータだけ取得
```

②でemailがstaffテーブルに存在しないと、`.single()` が `null` を返します。
その `null` に対して `.store_id` を読もうとするため、エラーが発生していました。

```
認証（auth）のユーザー → 登録済み ✅
staffテーブル          → 未登録   ❌ ← ここが原因
```

つまり **「ログインできる」と「アプリのデータにアクセスできる」は別の話** でした。

---

## 解決

Supabaseのダッシュボードで、staffテーブルにログイン中のユーザー情報を追加しました。

| カラム | 値 |
|--------|-----|
| store_id | 既存のstaffと同じstore_id |
| name | ユーザー名 |
| email | ログインに使っているemail |

追加後、ブラウザをリロードしたら正常に表示されました。

---

## 学び

- **認証（auth）とアプリのデータ（テーブル）は別管理。** Supabaseでログインできても、アプリ側のテーブルにデータがなければ動かない。
- **`.single()` は該当データがないと `null` を返す。** その後の処理で `null` チェックをしないとエラーになる。
- エラー文の `Cannot read properties of null` が出たら、**その変数がどこで `null` になったかを遡る**のが解決の近道。
