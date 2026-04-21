# Qiita記事管理

## フォルダ構成

```
qiita/
├── draft/    # 未投稿の記事
├── posted/   # 投稿済みの記事
└── README.md
```

## 記事投稿フロー

1. 記事を書く → `draft/` に置く
2. `/publish ファイル名` → タグ・Twitter文がfrontmatterに自動埋め込み
3. Qiitaに投稿（タグはfrontmatterからコピペ）
4. Twitterに投稿（frontmatterからコピペしてURL差し替え）
5. `draft/` → `posted/` に移す

## frontmatter

各記事の先頭にメタ情報が入っている。

```yaml
---
status: draft          # draft or posted
tags: React, Jest, ... # Qiita投稿用タグ
twitter: |             # Twitter投稿文
  〜した話を書きました。
  #React #Jest #個人開発
  [ここにQiitaのURLを貼る]
---
```
