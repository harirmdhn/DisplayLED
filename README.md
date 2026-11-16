# F1 Billboard Activation

A brand-activation experience inspired by mall LED billboards: a person opens a form on their
phone (via QR code), enters their name, takes a selfie, and their face appears on an animated
F1-style racing reveal on a big screen / LED board.

## Flow

1. **Phone / kiosk** (`kiosk.html`) — enter name → take selfie → submit.
2. **Transport** — the submission is pushed in real time to the big screen.
3. **Big screen / LED board** (`display.html`) — plays an animated F1 reveal with the person's
   face composited onto a generic racing-suit figure, their name, and racing graphics.

The face→body compositing is **Option 1 (simple overlay)** for now: the selfie is placed as the
"head" over an original, generic racing-suit figure. An AI face-generation step can be added later
(see `js/ai.js` placeholder).

## Two transport options

The front end is identical for both. You pick the transport in `js/config.js`.

### Option A — Firebase (static hosting, e.g. GitHub Pages)

- No server to run. Uses Firebase Firestore's real-time listeners.
- Host the static files anywhere (GitHub Pages works).
- Fill in your keys in `js/firebase-config.js` and set `TRANSPORT = 'firebase'` in `js/config.js`.
- See **docs/SETUP-firebase.md**.

### Option B — Node + WebSocket (self-hosted server)

- Run `server/server.js` (Node). Serves the same static files and relays submissions over
  WebSocket in real time. Deploy to Render / Railway / Fly.io (GitHub Pages can't run it).
- Set `TRANSPORT = 'websocket'` in `js/config.js`.
- See **docs/SETUP-node.md**.

## Project layout

```
.
├── index.html              # landing page + QR code to the kiosk
├── kiosk.html              # phone: form → selfie → submit
├── display.html            # big screen: animated F1 reveal
├── css/
│   ├── common.css
│   ├── kiosk.css
│   └── display.css
├── js/
│   ├── config.js           # choose transport: 'firebase' | 'websocket'
│   ├── firebase-config.js  # <-- paste your Firebase keys here (Option A)
│   ├── transport.js        # unified send/subscribe API over both backends
│   ├── composite.js        # draws selfie head onto the racing-suit figure (Canvas)
│   ├── ai.js               # placeholder for future AI face generation
│   ├── kiosk.js            # camera capture + submit
│   ├── display.js          # listen for entries + run the animation
│   └── qrcode.min.js       # tiny QR generator for the landing page
├── assets/
│   └── driver.svg          # original generic racing-suit figure (no real branding)
├── server/
│   ├── server.js           # Option B: Node + WebSocket server
│   └── package.json
└── docs/
    ├── SETUP-firebase.md
    └── SETUP-node.md
```

## Notes on assets & copyright

The racing figure (`assets/driver.svg`) is an original, generic design. It intentionally does
**not** use any real F1 team, sponsor, or driver branding/likeness. Use your own licensed assets
if you want specific branding.
