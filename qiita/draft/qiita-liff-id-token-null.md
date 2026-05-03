---
status: draft
tags: LINE, LIFF, Next.js, 個人開発, 初心者
twitter: |
  LIFFで「IDトークンが取れない」時に確認すべき2つのことを書きました。
  openidスコープと、QRのURL形式。両方ハマった人向けです。
  #LINE #LIFF #個人開発
  [ここにQiitaのURLを貼る]
---

# 【LIFF】「Error: IDトークンを取得できませんでした」が出る時に確認する2つのこと

## はじめに

LINEのLIFFを実装中、`liff.getIDToken()` がずっと null を返してハマりました。
原因は2つあって、両方クリアしないと動きません。

## 結論

1. LIFFアプリの **scope に `openid` を追加**する
2. QRコードのURLを **`https://liff.line.me/{LIFF_ID}` 経由**にする（直接Vercel等のドメインを指してはダメ）

## 起きたこと

LIFFページで以下のコードを書いた：

```ts
await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
const token = liff.getIDToken();
if (!token) {
  throw new Error("IDトークンを取得できませんでした");
}
```

iPhoneでQRを読み取ると、毎回 `null` が返ってきてエラー。

## 原因①：openidスコープ未設定

LIFFには「ユーザーのどの情報にアクセスしていいか」を指定する **scope（権限）** がある。

| scope | 取れるもの |
|---|---|
| `profile` | 名前・アイコン |
| `openid` | **IDトークン** |
| `email` | メールアドレス |

`profile` だけだと **IDトークンは発行されない**。LINE Developers Console → LIFFアプリ → Scope で `openid` を追加する。

## 原因②：QRのURLを直接ドメインに向けていた

最初はこういうURLをQRに埋めていた：

```
https://my-app.vercel.app/liff/select?code=XXX
```

これだとiPhoneのカメラがSafariで開いてしまい、**LINEアプリの外で実行される**。LIFFは LINEアプリ内ブラウザで動く前提なので、`liff.getIDToken()` がトークンを返せない。

正しくは **`https://liff.line.me/{LIFF_ID}?code=XXX`** にする。これだと：

- LINE が入ってる端末 → 自動でLINE内ブラウザで開く
- そこから初めて `liff.getIDToken()` が動く

## なぜそうなる仕組みなのか

LIFFのIDトークンは **OpenID Connect** という業界標準の仕組みで発行される。

- `openid` scope は OpenID Connect の必須scopeで、これを指定しないと「IDトークン発行リクエスト」とみなされない
- IDトークンには「このユーザーはLINE userId XXX」が **署名付き**で入っているので、サーバー側で検証して本人確認に使える

そして LIFFは **LINEアプリの認証セッションが必要**。Safariで開くと、LINEのセッションを引き継げないのでトークン発行ができない。

## 学び

- LIFFは「LINEアプリ内で動かす」が前提。外部ブラウザだと動かない
- IDトークンが欲しければ `openid` scope は必須
- 「設定したのに動かない」時は、scopeとURLの両方を疑う
