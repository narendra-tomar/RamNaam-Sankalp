# RamNaam Sankalp — Your Lifelong Naam Jaap Journey

A peaceful, offline-first PWA to track your Ram Naam Jaap from 1 Crore to 1 Billion, with cross-device sync via Firebase.

## Features

- **Lifetime Sankalp Tracking** — Target: 100 Crore (1 Billion)
- **Milestone Journey** — 25 meaningful milestones from 1 Cr → 13 Cr → 100 Cr
- **Multiple Entry Methods** — Direct count, malas, timed sessions, historical entries
- **Indian Number Format** — Automatic Lakh/Crore grouping (e.g., 1,00,00,000)
- **Sankalp Planner** — Calculate required daily pace to hit your target by a specific date
- **Completion Projection** — See how long to reach each milestone at current pace
- **Streak Tracking** — See your daily Sadhana consistency
- **Cross-Device Sync** — Your data stays in sync across phone, tablet, laptop
- **Offline Support** — Works completely offline; syncs when back online
- **Installable PWA** — Add to home screen, works like a native app
- **Zero Cost** — Firebase free tier handles unlimited personal use
- **Privacy First** — Your data is yours; only you can access it

## Setup (5 Minutes)

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **Create Project**
   - Project name: `RamNaam Sankalp`
   - Continue (accept defaults)
3. Wait for project to be created, then click **Continue**

### Step 2: Enable Firestore Database

1. In the Firebase console, go to **Build** → **Firestore Database**
2. Click **Create Database**
3. Choose location: Pick closest to you (or `us-central1`)
4. Security rules: Select **Start in test mode** (OK for personal use, we'll set rules later if desired)
5. Click **Create**

### Step 3: Enable Google Authentication

1. Go to **Build** → **Authentication**
2. Click **Get Started**
3. Select **Google** provider
4. Enable it, and fill in the email (your Google account)
5. Click **Save**

### Step 4: Get Your Firebase Config

1. Go to **Project Settings** (gear icon, top-left)
2. Under **Your apps**, click **Firebase SDK snippet**
3. Copy the config object (the part that looks like):
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

### Step 5: Update `js/firebase-config.js`

1. Open `js/firebase-config.js` in any text editor
2. Find the line that says `const firebaseConfig = { ... }`
3. Replace it with your copied config
4. Save the file

### Step 6: Deploy

Choose one (all are free):

#### Option A: Firebase Hosting (Easiest)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting  # Select your project, use "." as public directory
firebase deploy
```
Your app will be live at `https://YOUR-PROJECT-ID.web.app`

#### Option B: Vercel (Fastest)
1. Push your folder to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your GitHub repo
4. Deploy (automatic)

#### Option C: Netlify (Also Fast)
1. Drag and drop your project folder onto [Netlify](https://netlify.com)
2. Done — live immediately

#### Option D: Local + ngrok (For Testing Only)
```bash
python -m http.server 8000
# In another terminal:
ngrok http 8000
```

## Usage

### Add Jaap

**Dashboard** → **+ Add Jaap**
- Enter count (e.g., 5000)
- Pick date
- Optional notes (e.g., "Morning jaap")

### Add Mala

**Dashboard** → **+ Add Mala**
- Number of malas (e.g., 10)
- Count per mala (default 108)
- Auto-calculates total (10 × 108 = 1,080)

### Start Jaap Session

**Dashboard** → **Start Jaap Session**
- Timer starts
- Use **+1** or **+108** buttons to count
- Pause/resume as needed
- Complete to save

### View Milestones

**Milestones** tab shows:
- Phase I (1–13 Crore)
- Phase II (15–50 Crore)
- Phase III (60–100 Crore)

Green checkmark when each is complete.

### View History

**History** tab shows all entries, most recent first. Searchable.

### Sankalp Planner

**Sankalp** tab:
1. Pick your target milestone
2. Set target date
3. See required daily pace
4. Completion projections for various daily rates

### Settings

**⚙ Settings**:
- Starting count (jaap before using this app)
- Default mala size
- Export data as JSON

## Firestore Security Rules (Optional, More Secure)

If you want to lock down access so only you can read/write your data:

1. Go to **Firestore Database** → **Rules** tab
2. Replace with:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth.uid == userId;
       }
       match /jaapEntries/{doc=**} {
         allow read, write: if request.auth.uid == resource.data.userId;
       }
     }
   }
   ```
3. Publish

(Test mode allows anyone to read/write, so this is recommended if public access is a concern.)

## Data Structure

### Firestore Collections

**`users`** — one doc per user
```
{
  startingCount: 0,        // jaap before using app
  defaultMalaSize: 108,
  uid: "auto"              // Firebase sets this
}
```

**`jaapEntries`** — one doc per entry
```
{
  userId: "...",
  count: 5000,
  date: "2026-08-17",
  notes: "Morning jaap",
  createdAt: Timestamp
}
```

## Export & Backup

Your data is always yours. Anytime:
- **Settings** → **Export My Data (JSON)**
- Saves as `ramnaam-sankalp-backup.json`
- Contains all your entries + settings
- Can be imported elsewhere or kept as backup

## Offline & Sync

- App works 100% offline
- Data syncs to Firebase when back online
- No manual sync needed — automatic
- Firestore handles conflict resolution (last-write-wins)

## Install as App

### On iPhone/iPad
1. Open app in Safari
2. Tap Share → Add to Home Screen
3. Name it "RamNaam"
4. Tap Add

### On Android
1. Open app in Chrome
2. Tap menu (⋮) → Install app
3. Tap Install

### On Desktop
- Uses browser (Chrome, Firefox, Safari, Edge all work)

## File Structure

```
RamNaam Sankalp/
├── index.html              # Main app
├── manifest.json           # PWA config
├── sw.js                   # Service worker (offline)
├── css/
│   └── style.css          # Styling
├── js/
│   ├── app.js             # Main logic
│   ├── firebase-config.js # Your Firebase keys (UPDATE THIS)
│   └── indian-numbers.js  # Lakh/Crore formatting
└── icons/
    ├── icon-192.png       # App icon (PWA)
    └── icon-512.png
```

## Troubleshooting

### "Firebase is not defined"
- Check `firebase-config.js` is properly filled with your Firebase config

### "Sign-in not working"
- Make sure Google provider is enabled in Firebase → Authentication
- Confirm your email is in the OAuth consent screen

### "Entries not saving"
- Check browser console for errors (F12)
- Ensure you're signed in
- Check Firebase Firestore database exists and is active

### "Data not syncing across devices"
- Make sure you're signed in with the same Google account on both devices
- Check network connection
- Give it a few seconds — sync is near-instant but not immediate

### "Want to self-host or own the data?"
- Export your data regularly (Settings → Export)
- You can migrate to Supabase/PostgreSQL later if needed
- Your JSON export is portable

## Support

- **Firebase Docs**: https://firebase.google.com/docs
- **Report Issues**: Check browser console (F12) for errors

## Privacy

- Only you can access your data (Firestore rules)
- Google handles auth — you never give this app a password
- No tracking, analytics, or ads
- Data stored in Google Cloud (same as Gmail/Drive)

---

**श्री राम**

*May your Naam Jaap carry you to 100 Crore and beyond.*
