// ---------------------------------------------------------------------------
// Unified transport API
// ---------------------------------------------------------------------------
// Exposes two functions regardless of backend:
//
//   sendEntry(entry)            -> Promise<void>   (kiosk uses this)
//   subscribeEntries(onEntry)   -> unsubscribe fn  (display uses this)
//
// An "entry" is: { name: string, photo: string(dataURL), ts: number }
//
// The backend is chosen in js/config.js via CONFIG.TRANSPORT.
// ---------------------------------------------------------------------------

import { CONFIG } from './config.js';

// ---- Firebase (Option A) --------------------------------------------------

async function firebaseModules() {
  const appMod = await import(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js'
  );
  const fsMod = await import(
    'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js'
  );
  const { firebaseConfig, COLLECTION } = await import('./firebase-config.js');
  const app = appMod.initializeApp(firebaseConfig);
  const db = fsMod.getFirestore(app);
  return { fsMod, db, COLLECTION };
}

async function firebaseSend(entry) {
  const { fsMod, db, COLLECTION } = await firebaseModules();
  await fsMod.addDoc(fsMod.collection(db, COLLECTION), entry);
}

async function firebaseSubscribe(onEntry) {
  const { fsMod, db, COLLECTION } = await firebaseModules();
  // Only react to entries created after the page loads, newest first.
  const startedAt = Date.now();
  const q = fsMod.query(
    fsMod.collection(db, COLLECTION),
    fsMod.orderBy('ts', 'desc'),
    fsMod.limit(10)
  );
  const unsub = fsMod.onSnapshot(q, (snap) => {
    snap.docChanges().forEach((change) => {
      if (change.type !== 'added') return;
      const data = change.doc.data();
      if (typeof data.ts === 'number' && data.ts < startedAt) return; // skip history
      onEntry(data);
    });
  });
  return unsub;
}

// ---- WebSocket (Option B) -------------------------------------------------

function wsUrl() {
  if (CONFIG.WEBSOCKET_URL) return CONFIG.WEBSOCKET_URL;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}`;
}

// A single shared socket per page, with auto-reconnect.
let _socket = null;
let _listeners = [];
let _sendQueue = [];

function ensureSocket() {
  if (_socket && (_socket.readyState === 0 || _socket.readyState === 1)) return;
  _socket = new WebSocket(wsUrl());

  _socket.addEventListener('open', () => {
    // flush anything queued while disconnected
    _sendQueue.forEach((msg) => _socket.send(msg));
    _sendQueue = [];
  });

  _socket.addEventListener('message', (ev) => {
    let payload;
    try {
      payload = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (payload && payload.type === 'entry') {
      _listeners.forEach((fn) => fn(payload.entry));
    }
  });

  _socket.addEventListener('close', () => {
    // reconnect after a short delay
    setTimeout(ensureSocket, 1500);
  });

  _socket.addEventListener('error', () => {
    try {
      _socket.close();
    } catch {
      /* ignore */
    }
  });
}

function wsSend(entry) {
  ensureSocket();
  const msg = JSON.stringify({ type: 'entry', entry });
  if (_socket.readyState === 1) {
    _socket.send(msg);
  } else {
    _sendQueue.push(msg);
  }
  return Promise.resolve();
}

function wsSubscribe(onEntry) {
  ensureSocket();
  _listeners.push(onEntry);
  return () => {
    _listeners = _listeners.filter((fn) => fn !== onEntry);
  };
}

// ---- Public API -----------------------------------------------------------

export function sendEntry(entry) {
  if (CONFIG.TRANSPORT === 'websocket') return wsSend(entry);
  return firebaseSend(entry);
}

export function subscribeEntries(onEntry) {
  if (CONFIG.TRANSPORT === 'websocket') return wsSubscribe(onEntry);
  // firebaseSubscribe is async; return a thunk that unsubscribes once ready.
  let realUnsub = null;
  let cancelled = false;
  firebaseSubscribe(onEntry).then((unsub) => {
    if (cancelled) unsub();
    else realUnsub = unsub;
  });
  return () => {
    cancelled = true;
    if (realUnsub) realUnsub();
  };
}
