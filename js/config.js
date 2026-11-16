// ---------------------------------------------------------------------------
// Transport selection
// ---------------------------------------------------------------------------
// 'firebase'  -> Option A: static hosting + Firebase Firestore (e.g. GitHub Pages)
// 'websocket' -> Option B: self-hosted Node + WebSocket server (server/server.js)
//
// Change this one value to switch between the two backends. Everything else
// in the app is identical.
// ---------------------------------------------------------------------------

export const CONFIG = {
  // Pick your backend here:
  TRANSPORT: 'firebase', // 'firebase' | 'websocket'

  // Option B only: where the WebSocket server lives.
  // Leave as '' to auto-detect from the current page's host (recommended when
  // the Node server also serves these static files).
  WEBSOCKET_URL: '',

  // Branding / copy shown on screen (all generic, edit freely).
  BRAND: {
    title: 'RACE DAY',
    tagline: 'IS CLEARLY IN CONTROL',
    teamColor: '#e10600', // primary accent (red)
    teamColor2: '#00b4d8', // secondary accent (cyan)
  },

  // How long the big-screen reveal animation holds before returning to idle (ms).
  REVEAL_DURATION_MS: 12000,
};
