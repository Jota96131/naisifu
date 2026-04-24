---
status: draft
tags: Next.js, LINE, LIFF, Supabase, Vercel
twitter: |
  シフト管理アプリに「毎日16時に自動リマインドLINE送信」機能を実装。
  LIFFでユーザーID紐付け → Vercel Cronで定期実行。
  初見の技術ばかりでハマったのでまとめました。
  #Nextjs #LINE #個人開発
  [ここにQiitaのURLを貼る]
---

# 【Next.js × LINE × Vercel Cron】LIFFでユーザーID紐付け → 毎日自動リマインドを送る仕組み

## はじめに

個人開発でキャバクラの店舗管理アプリを作っています。Next.js + Supabaseの構成です。

これまで、出勤予定の女の子に「今日来れる？」とボーイ（男性スタッフ）が毎日一人ずつLINEで確認する作業がありました。人数が増えるほど負担が大きいので、これを自動化したのが今回の内容です。

結果、**毎日16時にVercelが `/api/remind` を叩き、今日シフトが入っている女の子のLINEにメッセージが飛ぶ** 仕組みができました。

## 構成

```
[Vercel Cron] ──毎日16時──> [/api/remind] ──> [LINE API] ──> [女の子のLINE]
                                  │
                                  ▼
                             [Supabase]
                            (今日のシフト取得)
```

- **Next.js 16** (App Router)
- **Supabase** (DB)
- **LINE Messaging API** (メッセージ送信)
- **LIFF** (ユーザーID取得)
- **Vercel Cron** (定期実行)

---

## 1. LIFFでLINEユーザーIDを取る

### LIFFとは

**LINEアプリの中で動くWebページ**。

| | 開いてる人が誰か |
|---|---|
| 普通のWebページ | サーバーにはわからない |
| LIFF | LINEが「この人は `Uxxx` の人ですよ」と教えてくれる |

### なぜ必要？

LINEでメッセージを送るには **userId**（`U1a2b3...`）が必要。でもこれ、本人もLINEアプリ上で確認できない。

→ LIFFなら自動で取得できる。

### 全体の流れ

```
[管理画面] QR生成 (?girl_id=xxx)
    ↓
[女の子] QRスキャン (LINEアプリで開く)
    ↓
[LIFFページ] liff.getProfile() → userId取得
    ↓
[Supabase] girls.line_user_id に保存
```

```tsx
// app/liff/register/page.tsx
"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import liff from "@line/liff";

function Inner() {
  const girlId = useSearchParams().get("girl_id");

  useEffect(() => {
    (async () => {
      await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
      if (!liff.isLoggedIn()) return liff.login();

      const { userId } = await liff.getProfile();
      await fetch("/api/line/register", {
        method: "POST",
        body: JSON.stringify({ userId, girlId }),
      });
    })();
  }, [girlId]);

  return <div>登録中...</div>;
}

export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
```

管理画面で発行したQRコード（`?girl_id=xxx`付き）を読んでもらうと、userIdが自動でDBに保存される。

> ⚠️ Next.js 16 で `useSearchParams()` を使うなら `<Suspense>` 必須。

---

## 2. リマインド送信APIを作る

`/api/remind` にGETが来たら、今日のシフトを取得してLINEを送る。

```ts
// app/api/remind/route.ts
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  // 認証
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 今日の日付（JST）
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

  // 今日のシフト取得
  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select("scheduled_time, girls(name, line_user_id)")
    .eq("scheduled_date", today);

  // 各女の子にLINE送信
  for (const shift of shifts ?? []) {
    // Supabaseのjoinは1:Nか1:1かで返り値の型が変わるため、配列チェックが必要
    const girl = Array.isArray(shift.girls) ? shift.girls[0] : shift.girls;
    if (!girl?.line_user_id) continue;

    await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: girl.line_user_id,
        messages: [{ type: "text", text: `${girl.name}さん、本日${shift.scheduled_time}から出勤予定です。` }],
      }),
    });
  }

  return Response.json({ ok: true });
}
```

### ポイント3つ

**① CRON_SECRETで認証**
誰でも叩けるとマズいので合言葉を設定。Vercel Cronが自動でヘッダーに付けて叩いてくれる。

**② タイムゾーンはJST明示**
`new Date()` はUTCベース。日本の「今日」は `toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })` で取る。

**③ supabaseAdmin (Service Role Key) を使う**
Cronはログインユーザーがいない → RLSバイパスが必要 → サーバー専用のService Role Keyで接続。

---

## 3. Vercel Cron で定期実行

`vercel.json` をプロジェクトルートに置くだけ。

```json
{
  "crons": [
    {
      "path": "/api/remind",
      "schedule": "0 7 * * *"
    }
  ]
}
```

### 注意点

- **時刻はUTC**。JST 16:00 = UTC 07:00（9時間引く）
- **Hobbyプランは1時間ウィンドウ**。16:00ちょうどじゃなく16:00〜17:00のどこかで発火

---

## 4. 環境変数は3箇所に登録が必要

ここが一番ハマった。それぞれ **別プロセスで動く** ので、同じ値をそれぞれに渡す必要がある。

| 場所 | 用途 |
|---|---|
| `.env.local` | ローカル開発時 |
| GitHub Secrets | CI/CDビルド時 |
| Vercel | 本番環境 |

**Vercelへの登録はCLIが楽**:

```bash
vercel login
vercel link
printf 'xxxxx' | vercel env add CRON_SECRET production
```

`echo` じゃなく `printf` を使う（改行が入らない）。

---

## つまづきリスト

| 症状 | 原因 | 解決 |
|---|---|---|
| `npm ci` で CI失敗 | pnpmプロジェクト | CIを `pnpm install --frozen-lockfile` に |
| pnpm バージョン不明 | `packageManager` 未設定 | package.jsonに追加 |
| `supabaseKey is required` | Vercelに環境変数なし | `vercel env add` |
| `useSearchParams` エラー | Suspense未使用 | `<Suspense>`で囲む |
| Cronが時間通り動かない | UTC基準 & Hobby仕様 | UTC換算、1h window許容 |

---

## まとめ

- **LIFF** = LINE内で動くWebページ。userId取得に使う
- **Vercel Cron** = `vercel.json` に書くだけ。時刻はUTC
- **環境変数は3箇所**: ローカル / GitHub / Vercel
- **CRON_SECRET** でAPIを守る
- **Service Role Key** はサーバー専用の特権鍵

これで「ボーイが毎日一人ずつ確認LINEを送る」作業がゼロになった。

📝 **続編予定**
- 女の子の「出勤/欠勤」返信処理（LINE Webhook + 署名検証）
- 今回のつまづきポイントを深掘りした別記事

---

## 参考

- [LIFF ドキュメント](https://developers.line.biz/ja/docs/liff/)
- [LINE Messaging API](https://developers.line.biz/ja/docs/messaging-api/)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
