# Modern Outline

A modern minimap outline for [Obsidian](https://obsidian.md). Displays your note's headings as small horizontal dashes overlaid on the edge of the note — longer for H1, progressively shorter for H2–H4. Hover to reveal heading names; click to jump.

![Modern Outline demo](https://raw.githubusercontent.com/KreNtal/obsidian-modern-outline/main/demo.gif)

## Features

- Minimal dash strip overlaid directly on the note (not in the sidebar)
- Hover the strip to reveal all heading names with a smooth fade animation
- Active heading highlighted in the accent color as you scroll
- Click any dash to jump to that heading — works even when focus is elsewhere
- Configurable side (left or right) and heading depth (H1–H4 by default)
- Works in both editing and reading mode

## Installation

### Manual

1. Download `main.js`, `styles.css`, `manifest.json` from the [latest release](../../releases/latest)
2. Copy them to `<vault>/.obsidian/plugins/obsidian-modern-outline/`
3. Reload Obsidian and enable the plugin in **Settings → Community plugins**

### Community plugin list

Coming soon.

## Settings

| Setting               | Default | Description                                          |
| --------------------- | ------- | ---------------------------------------------------- |
| Overlay position      | Right   | Show the strip on the left or right edge of the note |
| Minimum heading level | 1       | Hide headings above this level                       |
| Maximum heading level | 4       | Hide headings below this level                       |

## Development

```bash
git clone https://github.com/KreNtal/obsidian-modern-outline
cd obsidian-modern-outline
npm install
npm run dev       # watch mode
npm run build     # production build
```

Copy `main.js`, `styles.css`, `manifest.json` into your vault's plugin folder to test.

## License

[0BSD](LICENSE)
