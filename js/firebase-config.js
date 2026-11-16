// ---------------------------------------------------------------------------
// Firebase config (Option A only)
// ---------------------------------------------------------------------------
// 1. Create a free project at https://console.firebase.google.com
// 2. Add a Web App, then copy the firebaseConfig object it gives you.
// 3. Paste the values below (replace the REPLACE_ME placeholders).
// 4. Enable Firestore (in "test mode" to start) in the Firebase console.
//
// Full walkthrough: docs/SETUP-firebase.md
// ---------------------------------------------------------------------------

export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

// Firestore collection used to pass submissions from phone -> big screen.
export const COLLECTION = 'entries';
