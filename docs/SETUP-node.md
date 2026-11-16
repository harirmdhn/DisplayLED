# Option B — Node + WebSocket server (self-hosted)

This path runs a small Node server that both serves the static files **and** relays submissions
to the big screen over WebSocket in real time. No third-party database.

GitHub Pages **cannot** run this (it's static only). Run it locally on the event network, or
deploy to a free-tier host like Render, Railway, or Fly.io.

## 1. Point the app at the WebSocket transport

In `js/config.js` set:

```js
TRANSPORT: 'websocket',
WEBSOCKET_URL: '', // '' = auto-detect from the page host (recommended)
```

Leave `WEBSOCKET_URL` empty when the Node server also serves the pages (it does by default) —
the client derives `ws(s)://<same-host>` automatically.

## 2. Install & run locally

```bash
cd server
npm install
npm start
```

You'll see: `F1 billboard server running on http://localhost:3000`.

Open on the same machine:
- Big screen: <http://localhost:3000/display.html>
- Landing / QR: <http://localhost:3000/>

### Phones on the same Wi‑Fi

Find this machine's LAN IP (e.g. `192.168.1.50`) and have phones open
`http://192.168.1.50:3000/kiosk.html`.

> **Camera + HTTPS caveat:** browsers only allow the camera on `https://` or on `localhost`.
> Over a plain `http://<LAN-IP>` address the selfie step will be blocked. For a LAN demo, either:
> - run the display on `localhost` and use a tunneling tool (e.g. `ngrok http 3000`) to give
>   phones an HTTPS URL, or
> - deploy to a host that provides HTTPS (next section).

## 3. Deploy (HTTPS, public)

Any host that runs a Node process works. General steps for **Render** (similar for Railway/Fly):

1. Push this repo to GitHub.
2. Create a new **Web Service** from the repo.
3. Root directory: `server`. Build command: `npm install`. Start command: `npm start`.
4. Render gives you an HTTPS URL like `https://your-app.onrender.com`.
5. Open `.../display.html` on the TV and share the QR for `.../kiosk.html`.

Because the static files are served by the same Node process, the WebSocket auto-detects the
right host — no extra config needed.

## How it works

- `kiosk.js` builds the composite and calls `sendEntry()` → WebSocket message `{type:'entry', entry}`.
- `server.js` broadcasts it to every connected client.
- `display.js` receives it and plays the reveal animation (queued if several arrive at once).
