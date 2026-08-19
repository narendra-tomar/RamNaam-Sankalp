// ============================================================
// FIREBASE CONFIG — fill this in with YOUR Firebase project's
// values from: Firebase Console > Project Settings > Your apps
// (See README.md for step-by-step setup instructions.)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCDXhBCn3KloEPKjvIIdYmU9_owZOWu-fw",
  authDomain: "ramnaam-sankalp.web.app",
  projectId: "ramnaam-sankalp",
  storageBucket: "ramnaam-sankalp.appspot.com",
  messagingSenderId: "118894351329",
  appId: "1:11894351329:web:147c9f743c2be78c1131d"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);

// browserLocalPersistence is already the default, but setting it explicitly
// removes any ambiguity while diagnosing the repeated-logout issue.
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error('[Auth] Failed to set persistence:', err);
});
