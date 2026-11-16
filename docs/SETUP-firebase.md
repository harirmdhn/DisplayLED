# Option A — Firebase + GitHub Pages (static, no server)

This path hosts the whole app as static files (GitHub Pages) and uses Firebase Firestore's
real-time listeners to pass submissions from phones to the big screen.

## 1. Create a Firebase project

1. Go to <https://console.firebase.google.com> and **Add project** (any name).
2. You can skip Google Analytics.

## 2. Add a Web App

1. In the project, click the **Web** icon (`</>`) to register a web app.
2. Give it a nickname, click **Register app**.
3. Firebase shows a `firebaseConfig = { ... }` snippet. Copy those values.

## 3. Paste the keys

Open `js/firebase-config.js` and replace each `REPLACE_ME` with the matching value from the
snippet (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`).

## 4. Enable Firestore

1. In the console, go to **Build → Firestore Database → Create database**.
2. Start in **test mode** (fine for a demo / event). Pick a region near you.

> Test mode makes the database world-read/writable for ~30 days. Good enough for a short
> activation. For anything longer-lived, lock down the rules (see "Hardening" below).

## 5. Point the app at Firebase

In `js/config.js` set:

```js
TRANSPORT: 'firebase',
```

## 6. Host on GitHub Pages

1. Create a GitHub repo and push these files to it (I can do this step for you).
2. In the repo: **Settings → Pages → Build and deployment**. Source = **Deploy from a branch**,
   branch = `main`, folder = `/ (root)`. Save.
3. Wait ~1 minute. Your site is at `https://<user>.github.io/<repo>/`.

## 7. Run the activation

- On the TV / LED screen, open `.../display.html` (fullscreen the browser, press **F11**).
- Print/show the QR code from the landing page (`.../index.html`) so people can scan it.
- Scanning opens `.../kiosk.html` on their phone → name → selfie → send.
- The reveal animation plays on the big screen.

> **HTTPS note:** the camera only works on `https://` (or `localhost`). GitHub Pages is HTTPS,
> so you're fine.

## Hardening (optional, for longer events)

Lock Firestore so clients can only append entries, e.g.:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /entries/{id} {
      allow create: if request.resource.data.keys().hasOnly(['name','photo','selfie','ts']);
      allow read: if true;     // display needs to read
      allow update, delete: if false;
    }
  }
}
```

Also consider deleting old entries periodically; selfies as data URLs add up.
