# 英会話アプリ (english-conversation)

紙の上で英語を書くための学習アプリです。会話練習、画像の読み取り、AnkiDroid 向けの書き出しができます。

## できること

- **会話する** — レベル（A1〜C2）と相手・場面を選んで英会話
- **リスニング** — 文字を隠して聞き、タップで表示
- **画像を読む** — 写真から英語を読み取る
- **テキストを整形** — 単語 / 意味 / Core Concept / 例文5つ。CSV（AnkiDroid）、Excel、PDF
- **声** — 端末の声、または Grok（Eve / Luna / Orion / Liora / Atlas / Helix）
- **履歴** — 端末に保存。ログインすると端末をまたいで同期

## 動かし方

```bash
npm install
npm run dev
```

既定では `http://localhost:8080` で開きます。会話・読み取りには xAI の API キーが必要です。

```bash
npm run typecheck
npm run build
```

## 技術

TanStack Start、React 19、Tailwind CSS、Better Auth、PWA。
