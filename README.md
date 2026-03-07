# 🔗 [MarkLink](https://schmev91.github.io/marklink/)

A beautiful, static editor for **Markdown**, **JSON**, and **CSV** — with live preview, shareable links, and zero cloud storage. Everything stays in the URL.
## ✨ Features

### Markdown Mode
- 📝 **Live editor** with rich toolbar (bold, italic, headings, lists, code, tables, etc.)
- 📊 **Mermaid diagram rendering** — flowcharts, sequence diagrams, and more
- 🎨 **Syntax highlighting** — powered by highlight.js
- ⌨️ **Keyboard shortcuts** — Ctrl+B, Ctrl+I, Ctrl+K, Tab
- 📋 **Smart lists** — auto-continues lists and task items on Enter

### JSON Mode
- 🌳 **Tree view** — collapsible/expandable JSON structure
- 📦 **Nodes view** — card-based node display
- 🔍 **Search** — find keys & values with navigation
- ✅ **Validation** — real-time JSON syntax checking
- 🎨 **Auto-format** — prettify JSON with Ctrl+Shift+F

### CSV Mode
- 📊 **Interactive table view** — sticky headers, zebra striping
- ↕️ **Column sorting** — click headers to sort asc/desc
- 🔍 **Per-column filtering** — filter row below headers
- 👁️ **Column visibility** — hide/unhide columns via dropdown
- 🔄 **CSV → JSON** — convert and open in JSON mode
- 📥 **CSV export** — download as `.csv` file

### Shared
- 🌗 **Dark & Light mode** — with system preference detection
- 📐 **Resizable panels** — drag the splitter to resize editor/preview
- 👁️ **Collapsible panels** — hide the editor or preview entirely
- 🔗 **Share via URL** — lz-string compression for shareable links
- 📸 **Preview image export** — generate a PNG snapshot of the preview when you click “Share” (opens in a new tab / clipboard) without bloating the URL
- 📱 **Responsive design** — works great on desktop and mobile

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
├── index.html          # Markdown mode
├── json.html           # JSON mode
├── csv.html            # CSV mode
├── css/
│   └── style.css       # Design system (all modes, light/dark, responsive)
├── js/
│   ├── app.js          # Markdown orchestration
│   ├── editor.js       # Markdown editor & toolbar
│   ├── preview.js      # Markdown rendering + Mermaid
│   ├── share.js        # Markdown sharing
│   ├── json-app.js     # JSON orchestration
│   ├── json-editor.js  # JSON editor with validation
│   ├── json-preview.js # JSON tree & nodes view
│   ├── json-share.js   # JSON sharing
│   ├── csv-app.js      # CSV orchestration
│   ├── csv-editor.js   # CSV editor with validation
│   ├── csv-preview.js  # CSV table, sort, filter, columns
│   ├── csv-share.js    # CSV sharing
│   ├── splitter.js     # Resizable panel logic (shared)
│   └── theme.js        # Dark/light mode (shared)
└── README.md
```
