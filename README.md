# MultiView

**Watch multiple websites and videos at once.**

MultiView is an Electron desktop app. Paste any number of URLs and each one opens
as its own fully interactive browser pane — click, scroll, play, pause, type,
navigate, and use the site's own controls. No iframes, no X-Frame-Options fights.

```
React MultiView UI  +  Electron WebContentsView panes
        ↓                         ↓
   chrome / layout         real websites, isolated
```

---

## Why Electron?

A normal webpage cannot embed most sites in an `<iframe>` because of
`X-Frame-Options` and CSP `frame-ancestors`. MultiView does not try to bypass
those protections. Instead, each pane is a real Chromium tab owned by the
Electron main process (`WebContentsView`), so the site loads exactly the way it
would in Chrome.

---

## Quick start

Requires [Node.js](https://nodejs.org/) 22+.

```bash
npm install
npm run electron:dev    # or: npm run dev
```

That starts Vite, launches Electron, and opens the MultiView window.

Other scripts:

```bash
npm run build                 # compile main / preload / renderer → out/
npm run typecheck             # TypeScript project references
npm run electron:build        # compile + package with electron-builder
npm run electron:build:mac    # macOS .dmg / .zip
npm run electron:build:win    # Windows NSIS installer + portable exe
npm run electron:build:dir    # unpackaged app directory (fast local check)
```

---

## Using MultiView

1. Paste URLs into the landing page, one per line.
2. Press **Open** (or ⌘/Ctrl+Enter).
3. Each URL becomes an independent browser pane in a responsive grid.
4. Inside every pane you can click, scroll, play video, follow links, and type —
   it is a real webpage.
5. Use the per-pane toolbar for Back / Forward / Reload / Mute / Focus / Close,
   or click the hostname to edit the address and press Enter.
6. **Mute All**, **Solo audio**, layout presets (Auto, columns, 2×2 / 3×2 / 3×3),
   drag-to-reorder, and Focus mode (Esc to exit) work from the global toolbar.

Sessions are saved automatically. Reopening MultiView offers
**Continue previous session**.

---

## Architecture

```
src/
├── main/                 Electron main process
│   ├── index.ts          app lifecycle
│   ├── window.ts         BrowserWindow (React UI)
│   ├── paneManager.ts    owns every WebContentsView
│   ├── ipc.ts            typed IPC handlers
│   └── sessionStore.ts   persisted sessions
├── preload/              contextBridge → window.multiview
├── shared/               IPC contract + URL helpers
└── renderer/             React UI (Vite)
    ├── pages/            Landing + Viewer
    ├── components/       PaneCard, PaneGrid, Toolbar, …
    ├── context/          PaneStore, Toast
    └── hooks/            usePaneBounds, useHotkeys
```

**Layout sync.** React owns the visual grid. Each card exposes an empty
`.pane__content` region; a `ResizeObserver` measures it and sends DIP bounds to
the main process, which calls `view.setBounds(...)`. Nothing interactive is
drawn over that region, so clicks reach the website.

**Security.**

| Surface | Settings |
|---|---|
| MultiView UI | `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`, limited preload |
| Guest panes | same, **no preload**, separate `persist:panes` partition |
| Popups | `setWindowOpenHandler` — same-host stays in-pane, others are offered externally |
| Permissions | only `fullscreen` / `pointerLock` auto-allowed |

There are no certificate bypasses, no CSP/X-Frame hacks, and no Node access for
guest pages.

---

## Packaging

`electron-builder` is configured in `package.json`:

```bash
npm run electron:build:mac
npm run electron:build:win
```

Artifacts land in `release/`. Code signing is left to you — unsigned macOS
builds need a right-click → Open the first time.

---

## Push to GitHub

```bash
git init
git add .
git commit -m "MultiView Electron desktop app"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/MultiView.git
git push -u origin main
```

CI (`.github/workflows/ci.yml`) typechecks and builds on macOS, Windows, and
Linux for every push to `main`.

---

## License

MIT — see [LICENSE](LICENSE).
