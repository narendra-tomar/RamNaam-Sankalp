import { firebaseApp, auth, db } from './firebase-config.js';
import { formatIndianNumber, formatCroreLakh } from './indian-numbers.js';
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, addDoc, deleteDoc, Timestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();
const BILLION = 1_000_000_000;
const CRORE = 10_000_000;

let currentUser = null;
let userData = null;
let sessionStartTime = null;
let sessionActive = false;

// ============================================================
// MILESTONE DEFINITIONS
// ============================================================
const MILESTONES = [
  // Phase I
  { target: 1 * CRORE, label: '1 Crore', phase: 1 },
  { target: 2 * CRORE, label: '2 Crore', phase: 1 },
  { target: 3 * CRORE, label: '3 Crore', phase: 1 },
  { target: 4 * CRORE, label: '4 Crore', phase: 1 },
  { target: 5 * CRORE, label: '5 Crore', phase: 1 },
  { target: 6 * CRORE, label: '6 Crore', phase: 1 },
  { target: 7 * CRORE, label: '7 Crore', phase: 1 },
  { target: 8 * CRORE, label: '8 Crore', phase: 1 },
  { target: 9 * CRORE, label: '9 Crore', phase: 1 },
  { target: 10 * CRORE, label: '10 Crore', phase: 1 },
  { target: 11 * CRORE, label: '11 Crore', phase: 1 },
  { target: 12 * CRORE, label: '12 Crore', phase: 1 },
  { target: 13 * CRORE, label: '13 Crore', phase: 1 },
  // Phase II
  { target: 15 * CRORE, label: '15 Crore', phase: 2 },
  { target: 20 * CRORE, label: '20 Crore', phase: 2 },
  { target: 25 * CRORE, label: '25 Crore', phase: 2 },
  { target: 30 * CRORE, label: '30 Crore', phase: 2 },
  { target: 40 * CRORE, label: '40 Crore', phase: 2 },
  { target: 50 * CRORE, label: '50 Crore', phase: 2 },
  // Phase III
  { target: 60 * CRORE, label: '60 Crore', phase: 3 },
  { target: 70 * CRORE, label: '70 Crore', phase: 3 },
  { target: 80 * CRORE, label: '80 Crore', phase: 3 },
  { target: 90 * CRORE, label: '90 Crore', phase: 3 },
  { target: 100 * CRORE, label: '100 Crore (1 Billion)', phase: 3 },
];

// ============================================================
// DOM ELEMENTS
// ============================================================
const loadingScreen = document.getElementById('loadingScreen');
const loginScreen = document.getElementById('loginScreen');
const appShell = document.getElementById('appShell');
const googleSignInBtn = document.getElementById('googleSignInBtn');
const signOutBtn = document.getElementById('signOutBtn');

const lifetimeCount = document.getElementById('lifetimeCount');
const ringPercent = document.getElementById('ringPercent');
const pct10cr = document.getElementById('pct10cr');
const pct100cr = document.getElementById('pct100cr');
const ringFg = document.getElementById('ringFg');

const statToday = document.getElementById('statToday');
const statWeek = document.getElementById('statWeek');
const statMonth = document.getElementById('statMonth');
const statYear = document.getElementById('statYear');

const streakCount = document.getElementById('streakCount');
const msTarget = document.getElementById('msTarget');
const msCompleted = document.getElementById('msCompleted');
const msRemaining = document.getElementById('msRemaining');
const msBar = document.getElementById('msBar');

const addJaapBtn = document.getElementById('addJaapBtn');
const addMalaBtn = document.getElementById('addMalaBtn');
const startSessionBtn = document.getElementById('startSessionBtn');
const refreshBtn = document.getElementById('refreshBtn');
const settingsBtn = document.getElementById('settingsBtn');

const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

const modalOverlay = document.getElementById('modalOverlay');
const addJaapModal = document.getElementById('addJaapModal');
const addMalaModal = document.getElementById('addMalaModal');
const sessionModal = document.getElementById('sessionModal');
const settingsModal = document.getElementById('settingsModal');

const toast = document.getElementById('toast');

// ============================================================
// AUTH
// ============================================================
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    userData = { startingCount: 0, defaultMalaSize: 108 };
    showApp();
    // Load data in background
    loadUserData().then(() => refreshUI()).catch(err => {
      console.error('Error:', err);
      refreshUI();
    });
  } else {
    currentUser = null;
    userData = null;
    showLogin();
  }
});

googleSignInBtn.addEventListener('click', () => {
  signInWithPopup(auth, provider).catch(err => console.error(err));
});

signOutBtn.addEventListener('click', () => {
  signOut(auth);
});

// ============================================================
// UI SCREENS
// ============================================================
function showLogin() {
  loadingScreen.classList.add('hidden');
  loginScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
}

function showApp() {
  loadingScreen.classList.add('hidden');
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');
  refreshUI();
}

// ============================================================
// USER DATA
// ============================================================
async function loadUserData() {
  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      userData = {
        startingCount: 0,
        defaultMalaSize: 108,
      };
      await setDoc(userRef, userData);
    } else {
      userData = snap.data();
    }
  } catch (err) {
    console.error('Error loading user data:', err);
    userData = { startingCount: 0, defaultMalaSize: 108 };
  }
}

async function saveUserData() {
  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, userData);
}

async function addJaapEntry(count, date, notes = '') {
  const entry = {
    userId: currentUser.uid,
    count: Math.max(0, Math.round(count)),
    date: new Date(date).toISOString().split('T')[0],
    notes,
    createdAt: Timestamp.now(),
  };
  await addDoc(collection(db, 'jaapEntries'), entry);
  refreshUI();
  showToast('Jaap entry saved');
}

async function getLifetimeCount() {
  const q = query(collection(db, 'jaapEntries'), where('userId', '==', currentUser.uid));
  const snap = await getDocs(q);
  let total = userData.startingCount || 0;
  snap.forEach(doc => {
    total += doc.data().count || 0;
  });
  return total;
}

async function getTodayCount() {
  const today = getTodayStr();
  console.log('Today date:', today);
  const q = query(
    collection(db, 'jaapEntries'),
    where('userId', '==', currentUser.uid),
  );
  const snap = await getDocs(q);
  let total = 0;
  snap.forEach(doc => {
    const date = doc.data().date;
    console.log('Entry date:', date, 'count:', doc.data().count);
    if (date === today) {
      total += doc.data().count || 0;
    }
  });
  console.log('Today total:', total);
  return total;
}

async function getCountInRange(startDate, endDate) {
  const q = query(
    collection(db, 'jaapEntries'),
    where('userId', '==', currentUser.uid),
  );
  const snap = await getDocs(q);
  let total = 0;
  console.log('Range query:', startDate, 'to', endDate);
  snap.forEach(doc => {
    const date = doc.data().date;
    console.log('Checking:', date, 'in range?', date >= startDate && date <= endDate);
    if (date >= startDate && date <= endDate) {
      total += (doc.data().count || 0);
    }
  });
  console.log('Range total:', total);
  return total;
}

async function getStreak() {
  const q = query(
    collection(db, 'jaapEntries'),
    where('userId', '==', currentUser.uid),
  );
  const snap = await getDocs(q);
  const datesSet = new Set();
  snap.forEach(doc => datesSet.add(doc.data().date));

  if (datesSet.size === 0) return 0;

  const sortedDates = Array.from(datesSet).sort().reverse();
  let streak = 0;
  let checkDate = getTodayStr();

  for (const dateStr of sortedDates) {
    if (dateStr === checkDate) {
      streak++;
      const d = new Date(checkDate);
      d.setDate(d.getDate() - 1);
      checkDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else {
      break;
    }
  }
  return streak;
}

// ============================================================
// UI REFRESH
// ============================================================
async function refreshUI() {
  try {
    const lifetime = await getLifetimeCount();
    const today = await getTodayCount();
    const week = await getCountInRange(getDateBefore(7), getTodayStr());
    const month = await getCountInRange(getDateBefore(30), getTodayStr());
    const year = await getCountInRange(getDateBefore(365), getTodayStr());
    const streak = await getStreak();

    updateDashboard(lifetime, today, week, month, year, streak);
    updateMilestones(lifetime);
    updateHistory();
    updateSankalp();
  } catch (err) {
    console.error('Error refreshing UI:', err);
    updateDashboard(0, 0, 0, 0, 0, 0);
  }
}

function updateDashboard(lifetime, today, week, month, year, streak) {
  lifetimeCount.textContent = formatIndianNumber(lifetime);

  const pct100 = (lifetime / BILLION) * 100;
  const pct10 = (lifetime / (10 * CRORE)) * 100;

  const pct13cr = (lifetime / (13 * CRORE)) * 100;

  ringPercent.textContent = pct100.toFixed(4) + '%';
  pct10cr.textContent = pct13cr.toFixed(4) + '%';
  pct100cr.textContent = pct100.toFixed(4) + '%';

  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (pct100 / 100) * circumference;
  ringFg.style.strokeDashoffset = offset;

  statToday.textContent = formatIndianNumber(today);
  statWeek.textContent = formatIndianNumber(week);
  statMonth.textContent = formatIndianNumber(month);
  statYear.textContent = formatIndianNumber(year);

  streakCount.textContent = streak;
}

function updateMilestones(lifetime) {
  const current = MILESTONES.find(m => m.target > lifetime) || MILESTONES[MILESTONES.length - 1];
  const prev = MILESTONES.find(m => m.target <= lifetime);

  msTarget.textContent = current.label;
  msCompleted.textContent = formatIndianNumber(prev ? prev.target : 0);
  msRemaining.textContent = formatIndianNumber(Math.max(0, current.target - lifetime));

  const pctToMilestone = prev
    ? ((lifetime - prev.target) / (current.target - prev.target)) * 100
    : (lifetime / current.target) * 100;
  msBar.style.width = Math.min(100, pctToMilestone) + '%';

  renderMilestoneList(lifetime);
}

function renderMilestoneList(lifetime) {
  const phases = [1, 2, 3];
  phases.forEach(phase => {
    const selector = `#milestonesPhase${phase}`;
    const container = document.querySelector(selector);
    const phaseMs = MILESTONES.filter(m => m.phase === phase);
    container.innerHTML = phaseMs.map(m => `
      <div class="milestone-item ${lifetime >= m.target ? 'completed' : ''}">
        <span>${m.label}</span>
        <span class="milestone-check">${lifetime >= m.target ? '✓' : ''}</span>
      </div>
    `).join('');
  });
}

let currentEditId = null;

// Edit entry functions - must be global
window.editEntry = function(id, count, date) {
  currentEditId = id;
  document.getElementById('editCountInput').value = count;
  document.getElementById('editDateInput').value = date;
  openModal(document.getElementById('editEntryModal'));
};

async function updateHistory() {
  const q = query(collection(db, 'jaapEntries'), where('userId', '==', currentUser.uid));
  const snap = await getDocs(q);
  const entries = [];
  snap.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
  entries.sort((a, b) => new Date(b.date) - new Date(a.date));

  const historyList = document.getElementById('historyList');
  if (entries.length === 0) {
    historyList.innerHTML = '<div class="empty-state">No entries yet. Add your first Jaap.</div>';
  } else {
    historyList.innerHTML = entries.slice(0, 50).map(e => `
      <div class="history-item" style="cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="editEntry('${e.id}', ${e.count}, '${e.date}')">
        <div>
          <div class="history-date">${e.date}</div>
          ${e.notes ? `<div class="history-notes">${e.notes}</div>` : ''}
        </div>
        <div class="history-count">${formatIndianNumber(e.count)}</div>
      </div>
    `).join('');
  }
}

// Add event listeners for edit modal
document.getElementById('saveEditBtn').addEventListener('click', async () => {
  if (!currentEditId) return;
  const newCount = parseInt(document.getElementById('editCountInput').value) || 0;
  const newDate = document.getElementById('editDateInput').value;

  if (newCount > 0) {
    const ref = doc(db, 'jaapEntries', currentEditId);
    await updateDoc(ref, { count: newCount, date: newDate });
    closeAllModals();
    refreshUI();
    showToast('Entry updated');
  }
});

document.getElementById('deleteEntryBtn').addEventListener('click', async () => {
  if (!currentEditId) return;
  if (confirm('Delete this entry?')) {
    await deleteDoc(doc(db, 'jaapEntries', currentEditId));
    closeAllModals();
    refreshUI();
    showToast('Entry deleted');
  }
});

function updateProjection(lifetime, dailyPace) {
  const tbody = document.getElementById('projectionTableBody');
  const paces = [10000, 25000, 50000, 100000, 200000, 500000, 1000000];
  tbody.innerHTML = paces.map(pace => {
    const time1cr = ((1 * CRORE - lifetime) / pace) / 365;
    const time13cr = ((13 * CRORE - lifetime) / pace) / 365;
    const time100cr = ((100 * CRORE - lifetime) / pace) / 365;
    return `
      <tr>
        <td>${formatIndianNumber(pace)}</td>
        <td>${time1cr > 0 ? (time1cr < 1 ? Math.round(time1cr * 365) + ' days' : time1cr.toFixed(2) + ' yrs') : 'Done'}</td>
        <td>${time13cr > 0 ? (time13cr < 1 ? Math.round(time13cr * 365) + ' days' : time13cr.toFixed(2) + ' yrs') : 'Done'}</td>
        <td>${time100cr > 0 ? (time100cr < 1 ? Math.round(time100cr * 365) + ' days' : time100cr.toFixed(2) + ' yrs') : 'Done'}</td>
      </tr>
    `;
  }).join('');
}

async function updateSankalp() {
  const select = document.getElementById('sankalpTargetSelect');
  select.innerHTML = MILESTONES.map(m => `<option value="${m.target}">${m.label}</option>`).join('');
  document.getElementById('sankalpTargetDate').valueAsDate = new Date();

  const lifetime = await getLifetimeCount();
  const dailyPace = await getCountInRange(getDateBefore(7), getTodayStr());
  updateProjection(lifetime, Math.round(dailyPace / 7));
}

// ============================================================
// MODALS & BUTTONS
// ============================================================
addJaapBtn.addEventListener('click', () => openModal(addJaapModal));
addMalaBtn.addEventListener('click', () => openModal(addMalaModal));
startSessionBtn.addEventListener('click', () => openModal(sessionModal));
refreshBtn.addEventListener('click', () => {
  refreshBtn.style.animation = 'spin 0.6s linear';
  refreshUI().then(() => {
    refreshBtn.style.animation = '';
    showToast('Data refreshed');
  });
});
settingsBtn.addEventListener('click', () => openModal(settingsModal));

document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', closeAllModals);
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) closeAllModals();
});

function openModal(modal) {
  modalOverlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  setDefaultDates();
}

function closeAllModals() {
  modalOverlay.classList.add('hidden');
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
}

// Set default dates when modals open
function setDefaultDates() {
  const today = new Date().toISOString().split('T')[0];
  const jaapDate = document.getElementById('jaapDateInput');
  const malaDate = document.getElementById('malaDateInput');
  if (jaapDate) jaapDate.value = today;
  if (malaDate) malaDate.value = today;
}

document.getElementById('submitJaapBtn').addEventListener('click', async () => {
  const count = parseInt(document.getElementById('jaapCountInput').value) || 0;
  const date = document.getElementById('jaapDateInput').value;
  const notes = document.getElementById('jaapNotesInput').value;
  if (count > 0) {
    await addJaapEntry(count, date, notes);
    document.getElementById('jaapCountInput').value = '';
    document.getElementById('jaapNotesInput').value = '';
    closeAllModals();
  }
});

document.getElementById('malaCountInput').addEventListener('input', () => {
  const malaCount = parseInt(document.getElementById('malaCountInput').value) || 0;
  const malaSize = parseInt(document.getElementById('malaSizeInput').value) || 108;
  document.getElementById('malaTotalPreview').textContent = formatIndianNumber(malaCount * malaSize);
});

document.getElementById('submitMalaBtn').addEventListener('click', async () => {
  const malaCount = parseInt(document.getElementById('malaCountInput').value) || 0;
  const malaSize = parseInt(document.getElementById('malaSizeInput').value) || 108;
  const date = document.getElementById('malaDateInput').value;
  const total = malaCount * malaSize;
  if (total > 0) {
    await addJaapEntry(total, date, `${malaCount} × ${malaSize} mala`);
    document.getElementById('malaCountInput').value = '';
    closeAllModals();
  }
});

// ============================================================
// SESSION
// ============================================================
let sessionCount = 0;
let sessionTimer = 0;
let sessionInterval = null;

document.getElementById('sessionPlus1').addEventListener('click', () => {
  sessionCount++;
  document.getElementById('sessionCount').textContent = formatIndianNumber(sessionCount);
});

document.getElementById('sessionPlus108').addEventListener('click', () => {
  sessionCount += 108;
  document.getElementById('sessionCount').textContent = formatIndianNumber(sessionCount);
});

document.getElementById('sessionPauseBtn').addEventListener('click', () => {
  if (sessionActive) {
    clearInterval(sessionInterval);
    sessionActive = false;
    document.getElementById('sessionPauseBtn').textContent = 'Resume';
  } else {
    sessionStartTime = Date.now() - (sessionTimer * 1000);
    sessionInterval = setInterval(updateSessionTimer, 100);
    sessionActive = true;
    document.getElementById('sessionPauseBtn').textContent = 'Pause';
  }
});

document.getElementById('sessionCompleteBtn').addEventListener('click', async () => {
  clearInterval(sessionInterval);
  if (sessionCount > 0) {
    await addJaapEntry(sessionCount, getTodayStr(), `Session: ${formatTime(sessionTimer)}`);
  }
  sessionCount = 0;
  sessionTimer = 0;
  document.getElementById('sessionCount').textContent = '0';
  document.getElementById('sessionTimer').textContent = '00:00:00';
  document.getElementById('sessionPauseBtn').textContent = 'Pause';
  closeAllModals();
});

function updateSessionTimer() {
  sessionTimer = Math.floor((Date.now() - sessionStartTime) / 1000);
  document.getElementById('sessionTimer').textContent = formatTime(sessionTimer);
}

// ============================================================
// SETTINGS
// ============================================================
document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  userData.startingCount = parseInt(document.getElementById('startingCountInput').value) || 0;
  userData.defaultMalaSize = parseInt(document.getElementById('defaultMalaSizeInput').value) || 108;
  await saveUserData();
  showToast('Settings saved');
  closeAllModals();
});

document.getElementById('exportDataBtn').addEventListener('click', async () => {
  const q = query(collection(db, 'jaapEntries'), where('userId', '==', currentUser.uid));
  const snap = await getDocs(q);
  const entries = [];
  snap.forEach(doc => entries.push(doc.data()));
  const data = { userData, entries, exportedAt: new Date().toISOString() };
  const json = JSON.stringify(data, null, 2);
  downloadJSON(json, 'ramnaam-sankalp-backup.json');
  showToast('Data exported');
});

// ============================================================
// TABS
// ============================================================
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// ============================================================
// HELPERS
// ============================================================
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function getTodayStr() {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  const result = `${year}-${month}-${day}`;
  console.log('IST Today:', result);
  return result;
}

function getDateBefore(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const formatter = new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
  const parts = formatter.formatToParts(d);
  const year = parts.find(p => p.type === 'year').value;
  const month = parts.find(p => p.type === 'month').value;
  const day = parts.find(p => p.type === 'day').value;
  return `${year}-${month}-${day}`;
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

function downloadJSON(json, filename) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// SERVICE WORKER (PWA)
// ============================================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
