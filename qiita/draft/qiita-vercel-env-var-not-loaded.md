---
status: draft
tags: Vercel, Next.js, 環境変数, 個人開発, 初心者
twitter: |
  Vercelで「環境変数を設定したのに読めない」時の落とし穴を記事にしました。
  Sharedに置いただけだとプロジェクトに反映されない、追加後はRedeployが必要、の2点。
  #Vercel #個人開発
  [ここにQiitaのURLを貼る]
---

# 【Vercel】「Error: サーバー設定エラー」(`process.env.XXX` が undefined)になる時の2つの原因

## はじめに

Vercelに環境変数を登録したのに、APIから読むと `undefined` になってサーバーエラーが出ました。
原因は2つあって、どちらか or 両方を踏むと詰みます。

## 結論

1. **Shared環境変数はプロジェクトに「Link」しないと読めない**
2. **環境変数の追加・更新後は Redeploy が必要**

## 起きたこと

Next.js のAPI Route でこういうコードを書いていた：

```ts
const channelId = process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID;
if (!channelId) {
  return new Response(JSON.stringify({ error: "サーバー設定エラー" }), {
    status: 500,
  });
}
```

Vercelのダッシュボードでは確かに `NEXT_PUBLIC_LIFF_CHANNEL_ID = 2009879147` が登録されている。
それなのに本番で「サーバー設定エラー」が返る。

## 原因①：Sharedに置いただけだった

Vercelの環境変数には **2つの置き場所** がある：

| 場所 | 用途 |
|---|---|
| **Project** | そのプロジェクト固有 |
| **Shared** | チーム全体で共有、複数プロジェクトで使い回せる |

Shared に置いた変数は、**各プロジェクトに「Link」するまで反映されない**。
私はSharedに置いただけで、プロジェクト側に紐付けていなかった。

### 解決
Shared変数の右の「⋯」メニュー →「Link to project」で対象プロジェクトを選択。
または、プロジェクトの環境変数ページで「Link Shared Variable」ボタンから追加。

## 原因②：Redeployしていなかった

Vercelの環境変数は **ビルド時にバンドルされる**。
そのため、変数を追加・更新しても **既存のデプロイには反映されない**。

### 解決
Vercel Dashboard → 対象プロジェクト → Deployments → 最新デプロイの「⋯」→ **Redeploy**。
ダイアログで「Use existing Build Cache」のチェックを外して実行する。

## なぜそうなる仕組みなのか

### Sharedの設計思想
チーム開発で「DBのURLは全プロジェクトで同じ値を使いたい」みたいな時、Sharedに1箇所置いて複数プロジェクトに配るのが効率的。
ただし「全部のプロジェクトに自動配布」だと事故が怖いので、**明示的に Link する設計** になっている。

### ビルド時バンドルの理由
`NEXT_PUBLIC_*` で始まる環境変数は **クライアントJSにも埋め込まれる**。
これはビルド時に静的に書き込まれるので、ランタイムで動的に変更できない。
だから環境変数を変えたら必ず再ビルド（=Redeploy）が必要。

## 学び

- 「Vercelで環境変数設定したのに動かない」は **Link忘れか Redeploy忘れ** の二択がほとんど
- Shared を使うなら Link 必須
- 環境変数を追加・更新したら必ず Redeploy
- `NEXT_PUBLIC_*` はビルド時に埋め込まれることを覚えておく
