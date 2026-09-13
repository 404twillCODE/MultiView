# MultiView

**Watch multiple videos at once.** Paste a list of links, one per line, and MultiView opens them
all together on a single responsive wall — each player independently controllable.

No backend, no database, no API keys. Everything runs in the browser and your session is stored in
`localStorage`, so it works perfectly as a static site on GitHub Pages.

---

## Features

- **Paste any number of links** — one per line, with whitespace, blanks and duplicates cleaned up
  automatically.
- **Automatic source detection** — YouTube (`watch`, `youtu.be`, Shorts, `live`, playlists), Vimeo
  (including unlisted privacy hashes), Twitch, Dailymotion, Streamable, TikTok, Google Drive,
  direct video files (`.mp4`, `.webm`, `.ogg`, `.mov`, `.m3u8`, …) and generic embeddable pages.
- **Responsive grid** — Auto layout adapts to the browser width, or pin it to 1–4 columns.
- **Independent controls** — every player keeps its provider's native controls: play, pause, seek,
  volume and fullscreen, one video at a time.
- **Focus mode** — blow one video up while the rest stay visible as thumbnails.
- **Drag & drop reordering** — plus "Move earlier / later" menu items for touch and keyboard users.
  Reordering never reloads a player.
- **Add while watching** — the Add Videos dialog merges new links into the wall without disturbing
  what is already playing, and tells you when something is already open.
- **Mute all / Reload all** — implemented through the official YouTube IFrame and Vimeo player
  `postMessage` APIs (and the DOM for direct files). No fake buttons for players that cannot
  actually be controlled.
- **Session persistence** — videos, their order and your layout preference survive a reload, and the
  start page offers to continue where you left off.
- **Shareable sessions** — copy a link that rebuilds the whole wall: `/#/watch?s=…`.
- **Keyboard shortcuts** — `Ctrl/Cmd + Enter` to open or add links, `A` to add videos, `Escape` to
  close a dialog or leave focus mode.
- **Honest error handling** — invalid lines are listed under "Couldn't load" instead of breaking the
  page, and sites that refuse embedding get a clear fallback card with an "Open Original Link"
  button.

---

## Quick start

Requires [Node.js](https://nodejs.org/) 20.19+ (or 22+) and npm.

```bash
npm install     # install dependencies
npm run dev     # start the dev server at http://localhost:5173
npm run build   # type-check and build to dist/
npm run preview # serve the production build locally
```

Try it with a mixed list like:

```
https://www.youtube.com/watch?v=dQw4w9WgXcQ
https://youtube.com/shorts/hT_nvWreIhg
https://vimeo.com/76979871
https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_1080_10s_1MB.mp4
```

---

## Push it to GitHub

Create an empty repository on GitHub (no README, no `.gitignore`), then:

```bash
git init
git add .
git commit -m "Initial commit: MultiView"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/MultiView.git
git push -u origin main
```

---

## Deploy to GitHub Pages

This repository ships with [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml), which
builds the site and publishes it on every push to `main`.

1. Push the project to GitHub (see above).
2. In your repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab).
5. Your site appears at `https://YOUR_USERNAME.github.io/MultiView/`.

### Why the paths just work

`vite.config.ts` sets `base: './'`, so all built assets are referenced relatively. That means the
same `dist/` works at a domain root, inside a project subdirectory such as `/MultiView/`, or under a
custom domain — no repository-specific configuration to remember.

Routing uses React Router's `HashRouter` (`/#/`, `/#/watch`). GitHub Pages has no server-side
rewrites, and hash routes are resolved entirely in the browser, so refreshing or sharing
`/#/watch` can never produce a 404.

### Deploying by hand instead

```bash
npm run build
npx gh-pages -d dist   # or commit dist/ to a gh-pages branch yourself
```

---

## How it works

```
src/
├── App.tsx                    # providers + hash routes
├── main.tsx                   # React entry point
├── types.ts                   # shared types
├── pages/
│   ├── LandingPage.tsx        # page 1 — paste links
│   └── ViewerPage.tsx         # page 2 — the video wall
├── components/
│   ├── ErrorBoundary.tsx      # never show a blank screen
│   ├── Toast/                 # notification stack
│   ├── UrlInput/              # shared textarea + "Couldn't load" list
│   ├── Viewer/                # Toolbar, VideoGrid, VideoCard, VideoPlayer, …
│   └── ui/                    # Modal, Menu, ConfirmDialog, Logo
├── context/
│   ├── ToastContext.tsx       # toast API
│   └── VideoStore.tsx         # videos, order, layout + persistence
├── hooks/                     # useHotkeys, useMediaQuery, usePlayerControls
├── styles/                    # theme tokens + global styles
└── utils/
    ├── videoParser.ts         # parseVideoUrl, getYouTubeVideoId, getVimeoVideoId, isDirectVideo
    ├── urlHelpers.ts          # normalizeUrl, isProbablyUrl, splitUrlList
    ├── storage.ts             # localStorage session/draft/layout
    ├── playerCommands.ts      # YouTube & Vimeo postMessage APIs
    ├── share.ts               # share links + clipboard
    └── fullscreen.ts          # cross-browser fullscreen
```

Two details worth knowing:

**Reordering does not reload videos.** Moving an `<iframe>` in the DOM forces the browser to reload
it. So cards are always rendered in insertion order and positioned with the CSS `order` property —
dragging a video changes numbers, not DOM nodes, and playback continues untouched.

**Player control is declarative.** Each card's mute/speed/reload state lives in the viewer's state
and is applied by the player through official provider APIs. "Mute all" is therefore a prop change
rather than a remount, so nothing restarts.

---

## Known limitation: sites that block embedding

Many websites send `X-Frame-Options: DENY` or a `Content-Security-Policy: frame-ancestors` header,
which tells the browser to refuse being displayed inside another page. That is a security boundary,
and MultiView does not try to work around it, nor around DRM or login requirements.

Instead:

- Hosts that are known to refuse framing (X/Twitter, Instagram, Netflix, and friends) immediately
  show a fallback card explaining the situation with an **Open Original Link** button.
- Unknown hosts are given a real chance in an iframe. If nothing loads within a few seconds, the
  same fallback appears over the card — and you can dismiss it to keep waiting.
- Either way, the rest of the wall keeps playing normally.

---

## Theming

All colours, radii, shadows and motion live as CSS custom properties in
[`src/styles/theme.css`](src/styles/theme.css) (`--background`, `--surface`, `--surface-hover`,
`--border`, `--text`, `--text-muted`, `--accent`, `--danger`, …). MultiView ships dark-only; a light
theme just needs those variables redefined under a `[data-theme='light']` selector.

---

## Privacy

MultiView has no server of its own. Links you paste stay in your browser's `localStorage`, and
requests only go to the video hosts you chose. Share links encode the video URLs themselves, so
don't share a session containing a private or signed URL you wouldn't paste in a chat.

---

## License

MIT — see [LICENSE](LICENSE).
