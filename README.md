![banner.png](banner.png)

# OpenCode Desktop ✨🖥️

[English](README.md) | [日本語](README.ja.md)

> Your shiny, zero-fuss gateway to OpenCode Web on macOS. 🚀

![macOS](https://img.shields.io/badge/macOS-supported-111827?style=for-the-badge&logo=apple)
![Desktop](https://img.shields.io/badge/Desktop-Electron-1f2937?style=for-the-badge&logo=electron)
![UI](https://img.shields.io/badge/UI-Vue_3-0f172a?style=for-the-badge&logo=vuedotjs)

OpenCode Desktop helps you install, launch, and manage OpenCode Web in one beautiful app.
No CLI wrestling. No setup maze. Just open and code. 💫

## 🌟 Why You Will Love It

- ⚡ Guided setup for OpenCode + Oh My OpenCode
- 🧠 Built-in OpenCode Web in a native desktop window
- 🎛️ Friendly settings for web, auth, tunnel, and startup
- 🌐 Optional Cloudflare Tunnel for remote access
- 🧷 Tray/menu-bar mode for always-ready workflow

## ⏱️ 60-Second Start

1. Open this repo's **Releases** page.
2. Download the latest `.dmg`.
3. Drag `OpenCode Desktop` into `Applications`.
4. Launch the app and choose `Auto Install`.
5. Start coding in minutes. ✨

If macOS blocks launch, allow it in `System Settings > Privacy & Security`.

## 🛫 First Launch Flow

### ✅ Auto Install (recommended)
- Installs Homebrew if needed
- Installs OpenCode
- Installs Oh My OpenCode with practical defaults

### 🛠️ Advanced Install
- Lets you choose install method and optional provider choices

After setup, choose whether OpenCode Web should auto-start.

## 🧭 Daily Flow

- Open app -> OpenCode Web appears
- Click gear icon -> tweak settings
- Close window -> app stays in tray/menu bar
- Use tray `Quit` -> fully stop everything

## 🌍 Optional Remote Access (Cloudflare Tunnel)

Enable tunnel from Settings when you want access from outside your local machine.

Before enabling tunnel:
- 🔐 Set web auth username/password
- 🧾 Verify tunnel mode and token/hostname

Security tip: enabling tunnel without auth can expose your endpoint publicly. ⚠️

## 🆘 Quick Troubleshooting

### Web does not start
- Restart app and retry setup
- Ensure port `4096` is not already used

### Tunnel does not connect
- Install `cloudflared` from Settings
- Recheck token/hostname

### App looks closed but is still running
- It is likely in tray/menu-bar mode
- Use tray icon -> `Show OpenCode Desktop`

## 🗂️ Config Files

- `~/.config/opencode/opencode.json` (or `.jsonc`)
- `~/.config/opencode/oh-my-opencode.json` (or `.jsonc`)
- `~/.config/opencode-wrapper/settings.json`

## 🍎 Platform

macOS-focused.

---

Made to keep OpenCode setup smooth, fast, and fun. 🎉
