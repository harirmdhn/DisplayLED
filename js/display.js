// ---------------------------------------------------------------------------
// Display page (big screen / LED board): listen for entries and play the
// animated F1-style reveal. Queues entries so multiple submissions play in turn.
// ---------------------------------------------------------------------------

import { subscribeEntries } from './transport.js';
import { CONFIG } from './config.js';

const $ = (sel) => document.querySelector(sel);

const idle = $('#idle');
const stage = $('#stage');
const figure = $('#figure');
const nameEl = $('#reveal-name');
const taglineEl = $('#reveal-tagline');
const titleEl = $('#brand-title');

titleEl.textContent = CONFIG.BRAND.title;
document.documentElement.style.setProperty('--team', CONFIG.BRAND.teamColor);
document.documentElement.style.setProperty('--team2', CONFIG.BRAND.teamColor2);

const queue = [];
let playing = false;

function enqueue(entry) {
  if (!entry || !entry.photo) return;
  queue.push(entry);
  if (!playing) playNext();
}

async function playNext() {
  if (queue.length === 0) {
    playing = false;
    idle.classList.remove('hidden');
    stage.classList.add('hidden');
    return;
  }
  playing = true;
  idle.classList.add('hidden');

  const entry = queue.shift();

  // Reset animation state by cloning class list.
  stage.classList.remove('hidden');
  stage.classList.remove('run');
  // Force reflow so the animation restarts.
  // eslint-disable-next-line no-unused-expressions
  void stage.offsetWidth;

  figure.src = entry.photo;
  nameEl.textContent = (entry.name || 'DRIVER').toUpperCase();
  taglineEl.textContent = CONFIG.BRAND.tagline;

  stage.classList.add('run');

  // Hold, then move on.
  await new Promise((r) => setTimeout(r, CONFIG.REVEAL_DURATION_MS));
  playNext();
}

// Register the test key FIRST, so it works even if the transport backend
// (Firebase/WebSocket) is misconfigured or offline.
window.addEventListener('keydown', (e) => {
  if (e.key && e.key.toLowerCase() === 't') {
    enqueue({
      name: 'Test Driver',
      photo: 'assets/driver.svg',
      ts: Date.now(),
    });
  }
});

// Subscribe to live entries, but never let a bad/placeholder backend config
// crash the page (which would also kill the test key above).
try {
  subscribeEntries(enqueue);
} catch (err) {
  console.warn('Live transport not available yet:', err);
}
window.addEventListener('unhandledrejection', (e) => {
  console.warn('Transport subscription failed (ok for local test):', e.reason);
});
