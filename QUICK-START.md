# Quick Start (5 Minutes)

## 1. Create Firebase Project

Go to https://console.firebase.google.com
- Click **Create Project**
- Name: `RamNaam Sankalp`
- Click through defaults
- Wait ~2 min

## 2. Enable Firestore + Google Auth

In Firebase Console:

**Firestore:**
- **Build** → **Firestore Database** → **Create Database**
- Location: pick your region (or `us-central1`)
- Mode: **Start in test mode** ✓
- Create

**Authentication:**
- **Build** → **Authentication** → **Get Started**
- Click **Google**
- Enable + add your email
- Save

## 3. Copy Your Firebase Config

**Project Settings** (⚙ icon) → **Your apps** → **Firebase SDK snippet**

Copy this part:
```javascript
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "..."
};
```

## 4. Update `js/firebase-config.js`

Open `js/firebase-config.js` in any text editor.

Find:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  // ... etc
};
```

Replace with your copied config. Save.

## 5. Deploy (Pick One)

### Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select your project, use "." as public dir
firebase deploy
```

### Vercel (Easiest)
- Push to GitHub
- Go to https://vercel.com
- Import repo → Deploy

### Netlify
- Drag your folder to https://netlify.com
- Done

### Local Testing
```bash
python -m http.server 8000
# Open http://localhost:8000
```

## 6. Done!

Your app is live. Sign in with Google → Start adding Jaap.

---

For more details, see **README.md**.

---

**श्री राम संकल्प**
