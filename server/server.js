// ---------------------------------------------------------------------------
// Option B: Node + WebSocket server with AI generation job queue.
// ---------------------------------------------------------------------------
// Responsibilities:
//  1. Serve the static front end (project root, one level up).
//  2. Accept selfie submissions (POST /api/generate) and queue an AI job.
//  3. Process jobs ONE AT A TIME (matches real "40-150s" activations).
//  4. Let the phone poll job status (GET /api/status/:id).
//  5. When a job finishes, push the finished entry to all display screens
//     over WebSocket so the big screen plays the reveal.
//
// The AI call lives in ai-provider.js. Without a FAL_KEY it runs in MOCK mode
// (returns the generic racing figure) so the whole flow works end-to-end
// before you add a real key.
//
// Run:  cd server && npm install && npm start
// Env:  copy .env.example -> .env and set FAL_KEY=... (optional until you want real AI)
// ---------------------------------------------------------------------------

import http from 'node:http';
import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { generateRacingImage, PROVIDER_MODE } from './ai-provider.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PORT = process.env.PORT || 3000;
const BODY_LIMIT = 12 * 1024 * 1024; // 12MB (selfies are small, but be safe)

// Load .env (simple parser, no dependency).
loadDotEnv(join(__dirname, '.env'));

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

// ---- In-memory job queue -------------------------------------------------
// job: { id, name, email, phone, selfie, status, photo, error, position, ts }
// status: 'queued' | 'processing' | 'done' | 'error'
const jobs = new Map();
const queue = [];
let working = false;

function enqueueJob(data) {
  const id = randomUUID();
  const job = {
    id,
    name: data.name || 'Driver',
    email: data.email || '',
    phone: data.phone || '',
    selfie: data.selfie,
    status: 'queued',
    photo: null,
    error: null,
    ts: Date.now(),
  };
  jobs.set(id, job);
  queue.push(id);
  pump();
  return job;
}

function queuePosition(id) {
  const idx = queue.indexOf(id);
  return idx < 0 ? 0 : idx; // 0 = next / currently processing
}

async function pump() {
  if (working) return;
  const id = queue.shift();
  if (!id) return;
  working = true;

  const job = jobs.get(id);
  if (!job) {
    working = false;
    return pump();
  }

  job.status = 'processing';
  try {
    const photo = await generateRacingImage(job.selfie, {
      name: job.name,
    });
    job.photo = photo;
    job.status = 'done';
    // Push to all display screens.
    broadcast({
      type: 'entry',
      entry: { name: job.name, photo, ts: Date.now() },
    });
  } catch (err) {
    job.status = 'error';
    job.error = String(err && err.message ? err.message : err);
    console.error('AI job failed:', job.error);
  } finally {
    // Free the (large) selfie from memory once processed.
    job.selfie = null;
    working = false;
    pump();
  }
}

// ---- HTTP server ----------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  // --- API routes ---
  if (path === '/api/generate' && req.method === 'POST') {
    return handleGenerate(req, res);
  }
  if (path.startsWith('/api/status/') && req.method === 'GET') {
    return handleStatus(path.slice('/api/status/'.length), res);
  }
  if (path === '/api/health' && req.method === 'GET') {
    return json(res, 200, { ok: true, mode: PROVIDER_MODE, queued: queue.length });
  }

  // --- Static files ---
  return serveStatic(path, res);
});

function handleGenerate(req, res) {
  let size = 0;
  const chunks = [];
  req.on('data', (c) => {
    size += c.length;
    if (size > BODY_LIMIT) {
      res.writeHead(413);
      res.end('Payload too large');
      req.destroy();
      return;
    }
    chunks.push(c);
  });
  req.on('end', () => {
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'Invalid JSON' });
    }
    if (!body.selfie || typeof body.selfie !== 'string') {
      return json(res, 400, { error: 'Missing selfie' });
    }
    const job = enqueueJob(body);
    return json(res, 202, {
      id: job.id,
      status: job.status,
      position: queuePosition(job.id),
    });
  });
}

function handleStatus(id, res) {
  const job = jobs.get(id);
  if (!job) return json(res, 404, { error: 'Unknown job id' });
  return json(res, 200, {
    id: job.id,
    status: job.status,
    position: queuePosition(job.id),
    photo: job.status === 'done' ? job.photo : null,
    error: job.error,
  });
}

function serveStatic(pathname, res) {
  let urlPath = decodeURIComponent(pathname);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = normalize(join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(res);
}

function json(res, code, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(data),
  });
  res.end(data);
}

// ---- WebSocket (push finished entries to displays) ------------------------
const wss = new WebSocketServer({ server });

function broadcast(msg) {
  const out = JSON.stringify(msg);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(out);
  });
}

wss.on('connection', (socket) => {
  // Displays mainly listen. We still accept direct 'entry' messages (e.g. the
  // "press T" test on the display) and relay them.
  socket.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }
    if (msg && msg.type === 'entry' && msg.entry) {
      broadcast({ type: 'entry', entry: msg.entry });
    }
  });
});

server.listen(PORT, () => {
  console.log(`F1 billboard server running on http://localhost:${PORT}`);
  console.log(`AI provider mode: ${PROVIDER_MODE}`);
  if (PROVIDER_MODE === 'mock') {
    console.log('(No FAL_KEY set — running in MOCK mode. Flow works; images are the generic figure.)');
  }
  console.log('Open display.html on the TV and kiosk.html on phones.');
});

// ---- tiny .env loader -----------------------------------------------------
function loadDotEnv(file) {
  if (!existsSync(file)) return;
  try {
    const txt = readFileSync(file, 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
}
