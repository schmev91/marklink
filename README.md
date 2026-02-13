# [🔗 MarkLink]([url](https://schmev91.github.io/marklink/))

The sole purpose of this project is to view Markdown on the web and share it via embed links that do not require storing Markdown on any cloud. It is a beautiful, static Markdown editor with **live preview**, **Mermaid diagram support**, **syntax highlighting**, and **shareable links**
## ✨ Features

- 📝 **Live Markdown editor** with rich toolbar (bold, italic, headings, lists, code, tables, etc.)
- 📊 **Mermaid diagram rendering** — flowcharts, sequence diagrams, and more
- 🎨 **Syntax highlighting** — powered by highlight.js
- 🌗 **Dark & Light mode** — with system preference detection
- 📐 **Resizable panels** — drag the splitter to resize editor/preview
- 👁️ **Collapsible panels** — hide the editor or preview entirely
- 🔗 **Share via URL** — compresses markdown with lz-string for short shareable links
- 📱 **Responsive design** — works great on desktop and mobile
- ⌨️ **Keyboard shortcuts** — Ctrl+B (bold), Ctrl+I (italic), Ctrl+K (link), Tab (indent)
- 📋 **Smart lists** — auto-continues lists and task items on Enter

## 🛠️ Tech Stack

| Library | Purpose |
|---|---|
| [marked.js](https://marked.js.org/) | Markdown parsing |
| [highlight.js](https://highlightjs.org/) | Code syntax highlighting |
| [mermaid.js](https://mermaid.js.org/) | Diagram rendering |
| [lz-string](https://pieroxy.net/blog/pages/lz-string/) | URL compression for sharing |

## 📁 Project Structure

```
marklink/
├── index.html          # Single HTML entry point
├── css/
│   └── style.css       # Design system (light/dark themes, responsive)
├── js/
│   ├── app.js          # Main orchestration
│   ├── editor.js       # Editor & toolbar
│   ├── preview.js      # Markdown rendering + Mermaid
│   ├── share.js        # URL compression & sharing
│   ├── splitter.js     # Resizable panel logic
│   └── theme.js        # Dark/light mode
└── README.md
```
