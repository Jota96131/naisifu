---
status: draft
tags: LINE, LIFF, Next.js, React, 個人開発
twitter: |
  LIFFのリダイレクト後にクエリパラメータが消える問題でハマったので記事にしました。
  liff.init() の前か後かで挙動が変わるという罠。
  #LINE #LIFF #個人開発
  [ここにQiitaのURLを貼る]
---

# 【LIFF】「店舗コードが指定されていません」と出る → クエリパラメータが消える問題と解決法

## はじめに

LIFFで店舗コードを `?code=XXX` で渡そうとしたら、リダイレクト後に値が消えてエラーになりました。
原因は **`liff.init()` を呼ぶ前にクエリを取りにいっていた** こと。

## ざっくりイメージ（空港の手荷物に例える）

LIFFの認証は **空港の保安検査** みたいなもの。
クエリパラメータ（`?code=ヒスイ`）はスーツケースで、そのままじゃ通れないので **箱に預けさせられる**。

```
預ける前: ?code=ヒスイ              ← スーツケース丸見え
預けた後: ?liff.state=?code=ヒスイ   ← 箱(liff.state)の中に押し込まれた
```

`liff.init()` は **到着空港での荷物受け取り**。これを呼ぶとSDKが箱を開けて、元のスーツケースを返してくれる。

**バグの正体**: 荷物を受け取る前（`liff.init()` の前）に「ヒスイのスーツケースくれ」と言ったから、まだ箱の中で `null` が返ってきた。

## 結論

クエリパラメータの取得は **必ず `liff.init()` の後** で行う。

```ts
// ❌ NG
const code = searchParams.get("code");  // liff.init() より前
useEffect(() => {
  liff.init(...);
}, []);

// ✅ OK
useEffect(() => {
  await liff.init(...);
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
}, []);
```

## 起きたこと

QRコードに以下のURLを埋めた：

```
https://liff.line.me/{LIFF_ID}?code=ヒスイ
```

iPhoneで読み取ると、LIFFが認証してアプリページにリダイレクトする。
そこで `searchParams.get("code")` を呼ぶと **`null`** が返ってくる。
画面には「店舗コードが指定されていません」のエラー。

## 原因

LIFFは認証時に元のクエリパラメータを **`liff.state` というキーに詰め替えて**リダイレクトする：

```
リダイレクト前
https://liff.line.me/XXX?code=ヒスイ

リダイレクト後（liff.init() 前のURL）
https://my-app.vercel.app/liff/select?liff.state=?code=ヒスイ
                                       ↑
                            「ヒスイ」が中に押し込められてる
```

この状態で `searchParams.get("code")` しても、クエリ直下に `code` は存在しないので `null`。

そして **`liff.init()` を呼ぶとSDKが `liff.state` を解凍してURLを復元してくれる**：

```
liff.init() 後のURL
https://my-app.vercel.app/liff/select?code=ヒスイ
                                      ↑ 復元される
```

つまり「クエリを取るタイミングが早すぎた」のが原因。

## 解決手順

`useEffect` 内で **`liff.init()` を待ってから** クエリを読む：

```ts
useEffect(() => {
  const init = async () => {
    await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });

    if (!liff.isLoggedIn()) {
      liff.login({ redirectUri: window.location.href });
      return;
    }

    // liff.init() の後で取得
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    // ...
  };
  init();
}, []);
```

Next.js の `useSearchParams` フックはマウント時のURLを参照するので、LIFFの書き換え後の値が取れない。**`window.location.search` を直接読む** のが確実。

## なぜそうなる仕組みなのか

LIFFは認証フローのために LINEのサーバーを経由する。その時に元のURLパラメータをそのまま渡せないので、`liff.state` という箱に詰めて持ち運んでいる。

これはLIFF v2 の仕様で、SDKが解凍してくれるから普段は意識しないが、**SDK初期化前にクエリを読もうとすると詰む**。

## 学び

- LIFF を使うページでは、**`liff.init()` の後**にクエリ取得する
- `useSearchParams` ではなく `window.location.search` を使う
- 「リダイレクト後にパラメータが消えた」と感じたら `liff.state` を疑う
