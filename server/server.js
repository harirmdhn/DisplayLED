// ---------------------------------------------------------------------------
// Option B: Node + WebSocket server.
// ---------------------------------------------------------------------------
// - Serves the static front end (the project root, one level up).
// - Accepts { type: 'entry', entry } messages from kiosk pages and broadcasts
//   them to every connected display page in real time.
//
// Run:   cd server && npm install && npm start
// Then open:  http://<this-machine-ip>:3000/           (landing)
//             http://<this-machine-ip>:3000/display.html (big screen)
//             http://<this-machine-ip>:3000/kiosk.html   (phones)
//
// Remember to set TRANSPORT = 'websocket' in js/config.js.
// ---------------------------------------------------------------------------

import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..'); // project root (static files)
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  // Basic, safe static file serving.
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

// WebSocket relay.
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg && msg.type === 'entry' && msg.entry) {
      const out = JSON.stringify({ type: 'entry', entry: msg.entry });
      // Broadcast to all connected clients (displays will act on it).
      wss.clients.forEach((client) => {
        if (client.readyState === 1) client.send(out);
      });
    }
  });
});

server.listen(PORT, () => {
  console.log(`F1 billboard server running on http://localhost:${PORT}`);
  console.log('Open display.html on the TV and kiosk.html on phones.');
});
