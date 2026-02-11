![banner.png](banner.png)

# OpenCode Desktop ✨🖥️

[English](README.md) | [日本語](README.ja.md)

> macOS で OpenCode Web をサクッと始めるための、使いやすいデスクトップアプリ。🚀

![macOS](https://img.shields.io/badge/macOS-supported-111827?style=for-the-badge&logo=apple)
![Desktop](https://img.shields.io/badge/Desktop-Electron-1f2937?style=for-the-badge&logo=electron)
![UI](https://img.shields.io/badge/UI-Vue_3-0f172a?style=for-the-badge&logo=vuedotjs)

OpenCode Desktop は、OpenCode の導入・起動・設定を GUI で完結できるアプリです。
CLI の細かいセットアップに悩まず、すぐに使い始められます。💫

## 🌟 ここがうれしい

- ⚡ OpenCode / Oh My OpenCode をガイド付きで導入
- 🧠 OpenCode Web をアプリ内でそのまま利用
- 🎛️ 設定画面で web/auth/tunnel/startup をまとめて管理
- 🌐 必要に応じて Cloudflare Tunnel で外部アクセス
- 🧷 トレイ（メニューバー）常駐で、いつでも再開

## ⏱️ 60秒スタート

1. このリポジトリの **Releases** を開く
2. 最新の `.dmg` をダウンロード
3. `OpenCode Desktop` を `Applications` へドラッグ
4. アプリを起動して `Auto Install` を実行
5. すぐに OpenCode Web を使い始める ✨

初回起動で警告が出る場合は、`System Settings > Privacy & Security` から許可してください。

## 🛫 初回セットアップ

### ✅ Auto Install（おすすめ）
- 必要なら Homebrew を導入
- OpenCode を導入
- Oh My OpenCode を使いやすい既定値で導入

### 🛠️ Advanced Install
- インストール方法やオプションを自分で選択

セットアップ完了後、OpenCode Web を自動起動するか選べます。

## 🧭 ふだんの使い方

- アプリを開く -> OpenCode Web をそのまま利用
- 右下の歯車 -> 設定を調整
- ウィンドウを閉じる -> トレイ常駐（完全終了ではない）
- 完全終了したい -> トレイの `Quit`

## 🌍 外部アクセスしたいとき（Cloudflare Tunnel）

設定画面から Tunnel を有効化すると、外部ネットワークからアクセスできます。

有効化前のチェック:
- 🔐 Web 認証（username/password）を設定
- 🧾 Tunnel のモード、トークン、ホスト名を確認

セキュリティ注意: 認証なしで公開すると、第三者からアクセスされる可能性があります。⚠️

## 🆘 かんたんトラブル対処

### Web が起動しない
- アプリを再起動してセットアップを再実行
- `4096` ポートが他プロセスで使われていないか確認

### Tunnel が接続できない
- 設定画面から `cloudflared` をインストール
- トークン/ホスト名を再確認

### 閉じたのに動いている
- トレイ常駐している可能性があります
- トレイアイコン -> `Show OpenCode Desktop` を選択

### macOS のセキュリティ警告で開けない
- `System Settings > Privacy & Security` を開く
- セキュリティ欄で OpenCode Desktop の `Open Anyway` をクリック
- もう一度アプリを開き、確認ダイアログで `Open` を選択
- 動画ガイド: [`privacyandsecurity-approve.mp4`](privacyandsecurity-approve.mp4)

## 🗂️ 設定ファイル保存先

- `~/.config/opencode/opencode.json`（または `.jsonc`）
- `~/.config/opencode/oh-my-opencode.json`（または `.jsonc`）
- `~/.config/opencode-wrapper/settings.json`

## 🍎 対応プラットフォーム

現在は macOS 中心で対応しています。

---

OpenCode を、もっと速く、もっと気持ちよく。🎉
