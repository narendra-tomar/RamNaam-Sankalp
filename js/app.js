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
const SUPERADMIN_EMAIL = 'narendra.tomar.official@gmail.com';

let currentUser = null;
let userData = null;
let sessionStartTime = null;
let sessionActive = false;
let isSuperAdmin = false;

// ============================================================
// MILESTONE DEFINITIONS
// ============================================================
const DEFAULT_MILESTONES = [
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

function getMilestones() {
  if (userData && userData.customMilestones && userData.customMilestones.length) {
    return [...userData.customMilestones].sort((a, b) => a.target - b.target);
  }
  return DEFAULT_MILESTONES;
}

function formatMilestoneLabel(target) {
  const cr = target / CRORE;
  return `${Number.isInteger(cr) ? cr : cr.toFixed(2)} Crore`;
}

function getLifetimeGoal() {
  return (userData && userData.lifetimeGoal) || BILLION;
}

function formatBillionLabel(count) {
  return String(parseFloat((count / BILLION).toFixed(2)));
}

// Finds the next uncleared milestone (and the one before it) from the ladder.
// Once lifetime passes the top of the ladder, keeps auto-generating the next
// checkpoint in 10 Crore steps so this never runs out.
function getCurrentAndPrevMilestone(lifetime) {
  const milestones = getMilestones();
  const top = milestones[milestones.length - 1];

  if (lifetime < top.target) {
    const current = milestones.find(m => m.target > lifetime);
    const prev = milestones.reduce((acc, m) => (m.target <= lifetime ? m : acc), null);
    return { current, prev };
  }

  const step = 10 * CRORE;
  const stepsAboveTop = Math.floor((lifetime - top.target) / step);
  const prevTarget = top.target + stepsAboveTop * step;
  const currentTarget = prevTarget + step;

  return {
    current: { target: currentTarget, label: formatMilestoneLabel(currentTarget) },
    prev: { target: prevTarget, label: prevTarget === top.target ? top.label : formatMilestoneLabel(prevTarget) }
  };
}

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
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    isSuperAdmin = user.email === SUPERADMIN_EMAIL;
    userData = { startingCount: 0, defaultMalaSize: 108 };

    try {
      await loadUserData();
    } catch (err) {
      console.error('Error:', err);
    }

    if (userData.disabled) {
      showToast('Your access has been disabled.');
      await signOut(auth);
      return;
    }

    document.getElementById('adminTabBtn').classList.toggle('hidden', !isSuperAdmin);
    showApp();
    refreshUI();
  } else {
    currentUser = null;
    userData = null;
    isSuperAdmin = false;
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
        email: currentUser.email,
      };
      await setDoc(userRef, userData);
    } else {
      userData = snap.data();
      if (!userData.email) {
        userData.email = currentUser.email;
        await saveUserData();
      }
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
  const safeCount = Math.max(0, Math.round(count));
  const entry = {
    userId: currentUser.uid,
    count: safeCount,
    date: new Date(date).toISOString().split('T')[0],
    notes,
    createdAt: Timestamp.now(),
  };
  await addDoc(collection(db, 'jaapEntries'), entry);
  userData.lifetimeTotal = (userData.lifetimeTotal || 0) + safeCount;
  await saveUserData();
  refreshUI();
  showToast('Jaap entry saved');
}

// ============================================================
// STATS -- single shared fetch reused by every calculation below,
// instead of each one separately re-querying all of a user's entries.
// Bounded to the last RECENT_WINDOW_DAYS via the userId+date composite
// index, so read cost no longer grows with a user's total history --
// only with how much they've logged in the recent window.
// ============================================================
const RECENT_WINDOW_DAYS = 400;

async function fetchRecentEntries() {
  const q = query(
    collection(db, 'jaapEntries'),
    where('userId', '==', currentUser.uid),
    where('date', '>=', getDateBefore(RECENT_WINDOW_DAYS))
  );
  const snap = await getDocs(q);
  const entries = [];
  snap.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
  return entries;
}

async function fetchAllEntries() {
  const q = query(collection(db, 'jaapEntries'), where('userId', '==', currentUser.uid));
  const snap = await getDocs(q);
  const entries = [];
  snap.forEach(doc => entries.push({ id: doc.id, ...doc.data() }));
  return entries;
}

// userData.lifetimeTotal is maintained incrementally on every add/edit/delete
// so the lifetime count doesn't need to re-sum the full entry history each
// refresh. The first time this runs for an existing user, it does one full
// (unbounded) fetch to backfill the total -- a one-time cost, not repeated.
async function ensureLifetimeTotal() {
  if (userData.lifetimeTotal === undefined || userData.lifetimeTotal === null) {
    const allEntries = await fetchAllEntries();
    userData.lifetimeTotal = allEntries.reduce((sum, e) => sum + (e.count || 0), 0);
    await saveUserData();
  }
}

function calcRangeCount(entries, startDate, endDate) {
  return entries.reduce((sum, e) => {
    return (e.date >= startDate && e.date <= endDate) ? sum + (e.count || 0) : sum;
  }, 0);
}

function calcStreak(entries) {
  const datesSet = new Set(entries.map(e => e.date));
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
    await ensureLifetimeTotal();
    const entries = await fetchRecentEntries();

    const lifetime = (userData.startingCount || 0) + (userData.lifetimeTotal || 0);
    const todayStr = getTodayStr();
    const today = calcRangeCount(entries, todayStr, todayStr);
    const week = calcRangeCount(entries, getDateBefore(7), todayStr);
    const month = calcRangeCount(entries, getDateBefore(30), todayStr);
    const year = calcRangeCount(entries, getDateBefore(365), todayStr);
    const streak = calcStreak(entries);

    updateDashboard(lifetime, today, week, month, year, streak);
    updateMilestones(lifetime);
    updateHistoryFromEntries(entries);
    updateSankalp(lifetime, today, week);
  } catch (err) {
    console.error('Error refreshing UI:', err);
    updateDashboard(0, 0, 0, 0, 0, 0);
  }
}

function updateDashboard(lifetime, today, week, month, year, streak) {
  lifetimeCount.textContent = formatIndianNumber(lifetime);

  document.getElementById('heroScaleLabel').textContent = `${formatCroreLakh(lifetime)} till date`;

  const goal = getLifetimeGoal();
  const pctGoal = (lifetime / goal) * 100;
  const goalLabel = formatBillionLabel(goal);

  ringPercent.textContent = pctGoal.toFixed(4) + '%';
  pct100cr.textContent = pctGoal.toFixed(4) + '%';
  document.getElementById('heroSubGoalLabel').textContent = `${goalLabel} Billion`;
  document.getElementById('heroLabel').textContent = `${goalLabel} BILLION SANKALP`;
  document.getElementById('ringCaption').textContent = `of ${goalLabel} Bn`;

  const { current: nextMilestone } = getCurrentAndPrevMilestone(lifetime);
  const pctNext = (lifetime / nextMilestone.target) * 100;
  const phaseSuffix = nextMilestone.phase ? ` (Phase ${nextMilestone.phase})` : '';
  pct10cr.textContent = pctNext.toFixed(4) + '%';
  document.getElementById('phaseLine').textContent = `${nextMilestone.label}${phaseSuffix}`;

  const circumference = 2 * Math.PI * 60;
  const offset = circumference - (Math.min(100, pctGoal) / 100) * circumference;
  ringFg.style.strokeDashoffset = offset;

  statToday.textContent = formatIndianNumber(today);
  statWeek.textContent = formatIndianNumber(week);
  statMonth.textContent = formatIndianNumber(month);
  statYear.textContent = formatIndianNumber(year);

  streakCount.textContent = streak;
}

function updateMilestones(lifetime) {
  const { current, prev } = getCurrentAndPrevMilestone(lifetime);

  msTarget.textContent = current.label;
  msCompleted.textContent = formatIndianNumber(prev ? prev.target : 0);
  msRemaining.textContent = formatIndianNumber(Math.max(0, current.target - lifetime));

  const pctToMilestone = prev
    ? ((lifetime - prev.target) / (current.target - prev.target)) * 100
    : (lifetime / current.target) * 100;
  msBar.style.width = Math.min(100, pctToMilestone) + '%';

  renderMilestoneList(lifetime);
  renderMilestoneEditor();
}

function renderMilestoneList(lifetime) {
  const milestones = getMilestones();
  const isCustom = !!(userData && userData.customMilestones && userData.customMilestones.length);

  document.getElementById('milestonesDefaultWrap').classList.toggle('hidden', isCustom);
  document.getElementById('milestonesCustomWrap').classList.toggle('hidden', !isCustom);

  if (isCustom) {
    document.getElementById('milestonesCustomList').innerHTML = milestones.map(m => `
      <div class="milestone-item ${lifetime >= m.target ? 'completed' : ''}">
        <span>${m.label}</span>
        <span class="milestone-check">${lifetime >= m.target ? '✓' : ''}</span>
      </div>
    `).join('');
    return;
  }

  const phases = [1, 2, 3];
  phases.forEach(phase => {
    const selector = `#milestonesPhase${phase}`;
    const container = document.querySelector(selector);
    const phaseMs = milestones.filter(m => m.phase === phase);
    container.innerHTML = phaseMs.map(m => `
      <div class="milestone-item ${lifetime >= m.target ? 'completed' : ''}">
        <span>${m.label}</span>
        <span class="milestone-check">${lifetime >= m.target ? '✓' : ''}</span>
      </div>
    `).join('');
  });
}

// ============================================================
// MILESTONE EDITOR (custom ladder)
// ============================================================
function renderMilestoneEditor() {
  const milestones = getMilestones();
  const isCustom = !!(userData && userData.customMilestones && userData.customMilestones.length);

  document.getElementById('milestoneEditList').innerHTML = milestones.map(m => `
    <div class="milestone-item">
      <span>${m.label}</span>
      <button class="modal-close" style="font-size: 18px;" onclick="removeMilestone(${m.target})">&times;</button>
    </div>
  `).join('');

  document.getElementById('resetMilestonesBtn').classList.toggle('hidden', !isCustom);
}

async function refreshAfterMilestoneChange() {
  await refreshUI();
}

window.removeMilestone = async function(target) {
  const remaining = getMilestones()
    .map(m => ({ target: m.target, label: m.label }))
    .filter(m => m.target !== target);
  if (remaining.length === 0) {
    showToast('Keep at least one milestone');
    return;
  }
  userData.customMilestones = remaining;
  await saveUserData();
  showToast('Milestone removed');
  refreshAfterMilestoneChange();
};

document.getElementById('addMilestoneBtn').addEventListener('click', async () => {
  const input = document.getElementById('newMilestoneInput');
  const crValue = parseFloat(input.value);
  if (!crValue || crValue <= 0) {
    showToast('Enter a valid Crore value');
    return;
  }
  const target = Math.round(crValue * CRORE);
  const current = getMilestones().map(m => ({ target: m.target, label: m.label }));
  if (current.some(m => m.target === target)) {
    showToast('That milestone already exists');
    return;
  }
  current.push({ target, label: formatMilestoneLabel(target) });
  current.sort((a, b) => a.target - b.target);
  userData.customMilestones = current;
  await saveUserData();
  input.value = '';
  showToast('Milestone added');
  refreshAfterMilestoneChange();
});

document.getElementById('resetMilestonesBtn').addEventListener('click', async () => {
  if (!confirm('Reset to the default milestone ladder? Your custom milestones will be removed.')) return;
  userData.customMilestones = null;
  await saveUserData();
  showToast('Reset to default milestones');
  refreshAfterMilestoneChange();
});

let currentEditId = null;
let currentEditOldCount = 0;

// Edit entry functions - must be global
window.editEntry = function(id, count, date) {
  currentEditId = id;
  currentEditOldCount = count;
  document.getElementById('editCountInput').value = count;
  document.getElementById('editDateInput').value = date;
  openModal(document.getElementById('editEntryModal'));
};

// ============================================================
// HISTORY -- cached entries with search/date filtering and pagination
// ============================================================
const HISTORY_PAGE_SIZE = 15;
let historyEntriesCache = [];
let historyCurrentPage = 1;
let historySearchTerm = '';
let historySelectedIds = new Set();

function updateHistoryFromEntries(entries) {
  historyEntriesCache = [...entries].sort((a, b) => {
    const dateDiff = new Date(b.date) - new Date(a.date);
    if (dateDiff !== 0) return dateDiff;
    // Same day: break the tie with creation time so the most recently
    // added entry is always on top, not whatever order Firestore returned.
    const aTime = (a.createdAt && a.createdAt.toMillis) ? a.createdAt.toMillis() : 0;
    const bTime = (b.createdAt && b.createdAt.toMillis) ? b.createdAt.toMillis() : 0;
    return bTime - aTime;
  });
  historyCurrentPage = 1;
  historySelectedIds = new Set();
  renderHistoryPage();
}

function getFilteredHistoryEntries() {
  const fromDate = document.getElementById('historyFromDate').value;
  const toDate = document.getElementById('historyToDate').value;

  return historyEntriesCache.filter(e => {
    if (historySearchTerm && !(e.notes || '').toLowerCase().includes(historySearchTerm)) return false;
    if (fromDate && e.date < fromDate) return false;
    if (toDate && e.date > toDate) return false;
    return true;
  });
}

function getCurrentPageHistoryIds() {
  const filtered = getFilteredHistoryEntries();
  const start = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
  return filtered.slice(start, start + HISTORY_PAGE_SIZE).map(e => e.id);
}

function renderHistoryPage() {
  const historyList = document.getElementById('historyList');
  const filtered = getFilteredHistoryEntries();
  const totalPages = Math.max(1, Math.ceil(filtered.length / HISTORY_PAGE_SIZE));
  historyCurrentPage = Math.min(Math.max(1, historyCurrentPage), totalPages);

  if (filtered.length === 0) {
    historyList.innerHTML = historyEntriesCache.length === 0
      ? '<div class="empty-state">No entries yet. Add your first Jaap.</div>'
      : '<div class="empty-state">No entries match your filters.</div>';
  } else {
    const start = (historyCurrentPage - 1) * HISTORY_PAGE_SIZE;
    const pageEntries = filtered.slice(start, start + HISTORY_PAGE_SIZE);

    historyList.innerHTML = pageEntries.map(e => {
      const checked = historySelectedIds.has(e.id) ? 'checked' : '';
      return `
      <div class="history-item" style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
        <input type="checkbox" class="select-checkbox" ${checked} onchange="toggleHistorySelect('${e.id}', this.checked)">
        <div style="flex: 1; cursor: pointer;" onclick="editEntry('${e.id}', ${e.count}, '${e.date}')">
          <div class="history-date">${e.date}</div>
          ${e.notes ? `<div class="history-notes">${e.notes}</div>` : ''}
        </div>
        <div class="history-count">${formatIndianNumber(e.count)}</div>
      </div>
    `;
    }).join('');
  }

  document.getElementById('historyPageIndicator').textContent = `Page ${historyCurrentPage} of ${totalPages}`;
  document.getElementById('historyPrevBtn').disabled = historyCurrentPage <= 1;
  document.getElementById('historyNextBtn').disabled = historyCurrentPage >= totalPages;
  updateHistoryBulkBar();
}

function updateHistoryBulkBar() {
  const count = historySelectedIds.size;
  document.getElementById('historyBulkActions').classList.toggle('hidden', count === 0);
  document.getElementById('historySelectedCount').textContent = `${count} selected`;

  const pageIds = getCurrentPageHistoryIds();
  const allSelected = pageIds.length > 0 && pageIds.every(id => historySelectedIds.has(id));
  document.getElementById('historySelectAllCheckbox').checked = allSelected;
}

document.getElementById('historySelectAllCheckbox').addEventListener('change', (e) => {
  const pageIds = getCurrentPageHistoryIds();
  if (e.target.checked) {
    pageIds.forEach(id => historySelectedIds.add(id));
  } else {
    pageIds.forEach(id => historySelectedIds.delete(id));
  }
  renderHistoryPage();
});

window.toggleHistorySelect = function(id, checked) {
  if (checked) historySelectedIds.add(id);
  else historySelectedIds.delete(id);
  updateHistoryBulkBar();
};

document.getElementById('historyBulkDeleteBtn').addEventListener('click', async () => {
  const ids = Array.from(historySelectedIds);
  if (ids.length === 0) return;
  if (!confirm(`Delete ${ids.length} selected entr${ids.length === 1 ? 'y' : 'ies'}? This frees up storage but does NOT change your lifetime count or milestones. This cannot be undone.`)) return;

  await Promise.all(ids.map(id => deleteDoc(doc(db, 'jaapEntries', id))));
  showToast(`${ids.length} entr${ids.length === 1 ? 'y' : 'ies'} deleted`);
  historySelectedIds = new Set();
  refreshUI();
});

document.getElementById('historySearchInput').addEventListener('input', (e) => {
  historySearchTerm = e.target.value.trim().toLowerCase();
  historyCurrentPage = 1;
  renderHistoryPage();
});

document.getElementById('historyFromDate').addEventListener('change', () => {
  historyCurrentPage = 1;
  renderHistoryPage();
});

document.getElementById('historyToDate').addEventListener('change', () => {
  historyCurrentPage = 1;
  renderHistoryPage();
});

document.getElementById('historyPrevBtn').addEventListener('click', () => {
  historyCurrentPage--;
  renderHistoryPage();
});

document.getElementById('historyNextBtn').addEventListener('click', () => {
  historyCurrentPage++;
  renderHistoryPage();
});

// Add event listeners for edit modal
document.getElementById('saveEditBtn').addEventListener('click', async () => {
  if (!currentEditId) return;
  const newCount = parseInt(document.getElementById('editCountInput').value) || 0;
  const newDate = document.getElementById('editDateInput').value;

  if (newCount > 0) {
    const ref = doc(db, 'jaapEntries', currentEditId);
    await updateDoc(ref, { count: newCount, date: newDate });
    userData.lifetimeTotal = (userData.lifetimeTotal || 0) + (newCount - currentEditOldCount);
    await saveUserData();
    closeAllModals();
    refreshUI();
    showToast('Entry updated');
  }
});

document.getElementById('deleteEntryBtn').addEventListener('click', async () => {
  if (!currentEditId) return;
  if (confirm('Delete this entry?')) {
    await deleteDoc(doc(db, 'jaapEntries', currentEditId));
    userData.lifetimeTotal = Math.max(0, (userData.lifetimeTotal || 0) - currentEditOldCount);
    await saveUserData();
    closeAllModals();
    refreshUI();
    showToast('Entry deleted');
  }
});

document.getElementById('sankalpTargetSelect').addEventListener('change', (e) => {
  const customWrap = document.getElementById('sankalpCustomWrap');
  if (e.target.value === 'custom') {
    customWrap.classList.remove('hidden');
  } else {
    customWrap.classList.add('hidden');
  }
});

document.getElementById('saveSankalpBtn').addEventListener('click', async () => {
  const select = document.getElementById('sankalpTargetSelect');
  const targetDate = document.getElementById('sankalpTargetDate').value;
  const target = select.value === 'custom'
    ? parseInt(document.getElementById('sankalpCustomInput').value) || 0
    : parseInt(select.value) || 0;

  if (target <= 0) {
    showToast('Enter a valid target');
    return;
  }
  if (!targetDate) {
    showToast('Pick a target date');
    return;
  }

  userData.sankalp = { target, targetDate };
  await saveUserData();
  showToast('Sankalp saved');
  refreshUI();
});

document.getElementById('resetSankalpBtn').addEventListener('click', async () => {
  if (!confirm('Reset your Sankalp? This will clear your saved target and date.')) return;
  userData.sankalp = null;
  await saveUserData();
  document.getElementById('sankalpTargetSelect').value = String(getMilestones()[0].target);
  document.getElementById('sankalpCustomWrap').classList.add('hidden');
  document.getElementById('sankalpCustomInput').value = '';
  document.getElementById('sankalpTargetDate').valueAsDate = new Date();
  document.getElementById('sankalpResult').classList.add('hidden');
  showToast('Sankalp reset');
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

function updateSankalp(lifetime, today, week) {
  const select = document.getElementById('sankalpTargetSelect');
  const customWrap = document.getElementById('sankalpCustomWrap');
  const customInput = document.getElementById('sankalpCustomInput');
  select.innerHTML = getMilestones().map(m => `<option value="${m.target}">${m.label}</option>`).join('')
    + `<option value="custom">Custom Target</option>`;

  const saved = userData && userData.sankalp;
  if (saved) {
    const isPreset = getMilestones().some(m => m.target === saved.target);
    if (isPreset) {
      select.value = String(saved.target);
      customWrap.classList.add('hidden');
    } else {
      select.value = 'custom';
      customInput.value = saved.target;
      customWrap.classList.remove('hidden');
    }
    document.getElementById('sankalpTargetDate').value = saved.targetDate;
  } else {
    document.getElementById('sankalpTargetDate').valueAsDate = new Date();
    customWrap.classList.add('hidden');
  }

  const avgPace = Math.round(week / 7);
  document.getElementById('projectionPace').textContent =
    `${formatIndianNumber(avgPace)} Jaap/day (based on last 7 days)`;
  updateProjection(lifetime, avgPace);

  renderSankalpProgress(lifetime, today);
}

function renderSankalpProgress(lifetime, today) {
  const resultCard = document.getElementById('sankalpResult');
  const saved = userData && userData.sankalp;
  if (!saved) {
    resultCard.classList.add('hidden');
    return;
  }

  const remaining = Math.max(0, saved.target - lifetime);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.max(0, Math.ceil((new Date(saved.targetDate) - new Date(getTodayStr())) / msPerDay));
  const requiredAvg = daysRemaining > 0 ? Math.ceil(remaining / daysRemaining) : remaining;
  const aheadBehind = today - requiredAvg;

  document.getElementById('sankalpRemaining').textContent = formatIndianNumber(remaining);
  document.getElementById('sankalpDays').textContent = daysRemaining;
  document.getElementById('sankalpRequired').textContent = formatIndianNumber(requiredAvg) + '/day';
  document.getElementById('sankalpTodayTarget').textContent = formatIndianNumber(requiredAvg);

  const aheadBehindEl = document.getElementById('sankalpAheadBehind');
  if (remaining === 0) {
    aheadBehindEl.textContent = 'Completed! 🎉';
    aheadBehindEl.style.color = 'var(--success)';
  } else if (aheadBehind >= 0) {
    aheadBehindEl.textContent = `+${formatIndianNumber(aheadBehind)} ahead`;
    aheadBehindEl.style.color = 'var(--success)';
  } else {
    aheadBehindEl.textContent = `${formatIndianNumber(Math.abs(aheadBehind))} behind`;
    aheadBehindEl.style.color = '#c0392b';
  }

  resultCard.classList.remove('hidden');
}

// ============================================================
// MODALS & BUTTONS
// ============================================================
addJaapBtn.addEventListener('click', () => openModal(addJaapModal));
addMalaBtn.addEventListener('click', () => openModal(addMalaModal));
startSessionBtn.addEventListener('click', () => {
  openModal(sessionModal);
  startSessionTimer();
});
refreshBtn.addEventListener('click', () => {
  refreshBtn.style.animation = 'spin 0.6s linear';
  refreshUI().then(() => {
    refreshBtn.style.animation = '';
    showToast('Data refreshed');
  });
});
settingsBtn.addEventListener('click', () => {
  openModal(settingsModal);
  document.getElementById('startingCountInput').value = (userData && userData.startingCount) || 0;
  document.getElementById('defaultMalaSizeInput').value = (userData && userData.defaultMalaSize) || 108;
  document.getElementById('lifetimeGoalInput').value = formatBillionLabel(getLifetimeGoal());
});

// ============================================================
// SUPERADMIN PANEL
// ============================================================
const ADMIN_PAGE_SIZE = 10;
let adminUsersCache = [];
let adminCurrentPage = 1;
let adminSelectedUids = new Set();
let adminSearchTerm = '';

document.getElementById('adminTabBtn').addEventListener('click', () => {
  loadAdminUserList();
});

document.getElementById('adminSearchInput').addEventListener('input', (e) => {
  adminSearchTerm = e.target.value.trim().toLowerCase();
  adminCurrentPage = 1;
  renderAdminPage();
});

async function loadAdminUserList() {
  const listEl = document.getElementById('adminUserList');
  listEl.innerHTML = '<div class="empty-state">Loading users...</div>';
  try {
    const snap = await getDocs(collection(db, 'users'));
    const users = [];
    snap.forEach(d => users.push({ uid: d.id, ...d.data() }));
    users.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
    adminUsersCache = users;
    adminCurrentPage = 1;
    adminSelectedUids = new Set();
    adminSearchTerm = '';
    document.getElementById('adminSearchInput').value = '';
    renderAdminPage();
  } catch (err) {
    console.error('Error loading users:', err);
    listEl.innerHTML = '<div class="empty-state">Failed to load users. Admin Firestore rules may not be applied yet.</div>';
  }
}

function getFilteredUsers() {
  if (!adminSearchTerm) return adminUsersCache;
  return adminUsersCache.filter(u => (u.email || '').toLowerCase().includes(adminSearchTerm));
}

function getCurrentPageUids() {
  const start = (adminCurrentPage - 1) * ADMIN_PAGE_SIZE;
  return getFilteredUsers().slice(start, start + ADMIN_PAGE_SIZE).map(u => u.uid);
}

function renderAdminPage() {
  const listEl = document.getElementById('adminUserList');
  const filteredUsers = getFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ADMIN_PAGE_SIZE));
  adminCurrentPage = Math.min(Math.max(1, adminCurrentPage), totalPages);

  if (filteredUsers.length === 0) {
    listEl.innerHTML = adminSearchTerm
      ? '<div class="empty-state">No users match that email.</div>'
      : '<div class="empty-state">No users found.</div>';
  } else {
    const start = (adminCurrentPage - 1) * ADMIN_PAGE_SIZE;
    const pageUsers = filteredUsers.slice(start, start + ADMIN_PAGE_SIZE);

    listEl.innerHTML = pageUsers.map(u => {
      const lifetime = (u.startingCount || 0) + (u.lifetimeTotal || 0);
      const isSelf = u.uid === currentUser.uid;
      const checked = adminSelectedUids.has(u.uid) ? 'checked' : '';
      return `
        <div class="history-item" style="flex-direction: column; align-items: stretch; gap: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px;">
            ${isSelf ? '<span style="width:18px;"></span>' : `<input type="checkbox" class="select-checkbox" ${checked} onchange="toggleAdminSelect('${u.uid}', this.checked)">`}
            <div style="flex: 1;">
              <div class="history-date">${u.email || u.uid}</div>
              <div class="history-notes">${formatIndianNumber(lifetime)} lifetime jaap${u.disabled ? ' · <strong style="color:#c0392b">Disabled</strong>' : ''}</div>
            </div>
          </div>
          ${isSelf ? '' : `
            <div class="action-row" style="margin-bottom: 0;">
              <button class="btn btn-outline" style="flex:1;" onclick="toggleUserDisabled('${u.uid}', ${!u.disabled})">${u.disabled ? 'Enable' : 'Disable'}</button>
              <button class="btn btn-outline" style="flex:1; background:#ff6b6b; color:#fff; border:none;" onclick="deleteUserData('${u.uid}')">Delete Data</button>
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  document.getElementById('adminPageIndicator').textContent = `Page ${adminCurrentPage} of ${totalPages}`;
  document.getElementById('adminPrevBtn').disabled = adminCurrentPage <= 1;
  document.getElementById('adminNextBtn').disabled = adminCurrentPage >= totalPages;
  updateAdminBulkBar();
}

function updateAdminBulkBar() {
  const count = adminSelectedUids.size;
  document.getElementById('adminBulkActions').classList.toggle('hidden', count === 0);
  document.getElementById('adminSelectedCount').textContent = `${count} selected`;

  const selectableOnPage = getCurrentPageUids().filter(uid => uid !== currentUser.uid);
  const allSelected = selectableOnPage.length > 0 && selectableOnPage.every(uid => adminSelectedUids.has(uid));
  document.getElementById('adminSelectAllCheckbox').checked = allSelected;
}

document.getElementById('adminSelectAllCheckbox').addEventListener('change', (e) => {
  const selectableOnPage = getCurrentPageUids().filter(uid => uid !== currentUser.uid);
  if (e.target.checked) {
    selectableOnPage.forEach(uid => adminSelectedUids.add(uid));
  } else {
    selectableOnPage.forEach(uid => adminSelectedUids.delete(uid));
  }
  renderAdminPage();
});

window.toggleAdminSelect = function(uid, checked) {
  if (checked) adminSelectedUids.add(uid);
  else adminSelectedUids.delete(uid);
  updateAdminBulkBar();
};

document.getElementById('adminPrevBtn').addEventListener('click', () => {
  adminCurrentPage--;
  renderAdminPage();
});

document.getElementById('adminNextBtn').addEventListener('click', () => {
  adminCurrentPage++;
  renderAdminPage();
});

window.toggleUserDisabled = async function(uid, disable) {
  if (!isSuperAdmin || uid === currentUser.uid) return;
  await updateDoc(doc(db, 'users', uid), { disabled: disable });
  const u = adminUsersCache.find(x => x.uid === uid);
  if (u) u.disabled = disable;
  showToast(disable ? 'User disabled' : 'User enabled');
  renderAdminPage();
};

window.deleteUserData = async function(uid) {
  if (!isSuperAdmin || uid === currentUser.uid) return;
  if (!confirm('Delete all of this user\'s jaap entries and disable their access? This cannot be undone.')) return;

  const q = query(collection(db, 'jaapEntries'), where('userId', '==', uid));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
  await updateDoc(doc(db, 'users', uid), { disabled: true, lifetimeTotal: 0, startingCount: 0 });

  const u = adminUsersCache.find(x => x.uid === uid);
  if (u) { u.disabled = true; u.lifetimeTotal = 0; u.startingCount = 0; }

  showToast('User data deleted and access disabled');
  renderAdminPage();
};

async function bulkSetDisabled(disable) {
  const uids = Array.from(adminSelectedUids);
  if (uids.length === 0) return;

  await Promise.all(uids.map(uid => updateDoc(doc(db, 'users', uid), { disabled: disable })));
  uids.forEach(uid => {
    const u = adminUsersCache.find(x => x.uid === uid);
    if (u) u.disabled = disable;
  });

  showToast(`${uids.length} user(s) ${disable ? 'disabled' : 'enabled'}`);
  adminSelectedUids.clear();
  renderAdminPage();
}

async function bulkDeleteData() {
  const uids = Array.from(adminSelectedUids);
  if (uids.length === 0) return;
  if (!confirm(`Delete all jaap entries for ${uids.length} selected user(s) and disable their access? This cannot be undone.`)) return;

  for (const uid of uids) {
    const q = query(collection(db, 'jaapEntries'), where('userId', '==', uid));
    const snap = await getDocs(q);
    await Promise.all(snap.docs.map(d => deleteDoc(d.ref)));
    await updateDoc(doc(db, 'users', uid), { disabled: true, lifetimeTotal: 0, startingCount: 0 });

    const u = adminUsersCache.find(x => x.uid === uid);
    if (u) { u.disabled = true; u.lifetimeTotal = 0; u.startingCount = 0; }
  }

  showToast(`Data deleted for ${uids.length} user(s)`);
  adminSelectedUids.clear();
  renderAdminPage();
}

document.getElementById('adminBulkDisableBtn').addEventListener('click', () => bulkSetDisabled(true));
document.getElementById('adminBulkEnableBtn').addEventListener('click', () => bulkSetDisabled(false));
document.getElementById('adminBulkDeleteBtn').addEventListener('click', () => bulkDeleteData());

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
  if (voiceCountActive) stopVoiceCount();
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

function incrementSessionCount(n) {
  sessionCount += n;
  document.getElementById('sessionCount').textContent = formatIndianNumber(sessionCount);
}

document.getElementById('sessionPlus1').addEventListener('click', () => {
  incrementSessionCount(1);
});

document.getElementById('sessionPlus108').addEventListener('click', () => {
  incrementSessionCount(108);
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

let sessionCompleting = false;

document.getElementById('sessionCompleteBtn').addEventListener('click', async () => {
  // Guard against double-tap creating two entries: check-and-set happens
  // synchronously before any await, so a second click fired while the first
  // save is still in flight bails out immediately instead of racing it.
  if (sessionCompleting) return;
  sessionCompleting = true;
  const completeBtn = document.getElementById('sessionCompleteBtn');
  completeBtn.disabled = true;

  clearInterval(sessionInterval);
  sessionActive = false;
  if (voiceCountActive) stopVoiceCount();

  // Capture and reset session state immediately -- before the await -- so
  // even a re-entrant call would see sessionCount already back at 0.
  const countToSave = sessionCount;
  const timeToSave = sessionTimer;
  sessionCount = 0;
  sessionTimer = 0;
  document.getElementById('sessionCount').textContent = '0';
  document.getElementById('sessionTimer').textContent = '00:00:00';
  document.getElementById('sessionPauseBtn').textContent = 'Pause';

  if (countToSave > 0) {
    try {
      await addJaapEntry(countToSave, getTodayStr(), `Session: ${formatTime(timeToSave)}`);
    } catch (err) {
      console.error('Error saving session entry:', err);
      showToast('Could not save session -- check your connection and add it manually if needed');
    }
  }

  completeBtn.disabled = false;
  sessionCompleting = false;
  closeAllModals();
});

function startSessionTimer() {
  clearInterval(sessionInterval);
  sessionCount = 0;
  sessionTimer = 0;
  sessionCompleting = false;
  document.getElementById('sessionCompleteBtn').disabled = false;
  document.getElementById('sessionCount').textContent = '0';
  document.getElementById('sessionTimer').textContent = '00:00:00';
  document.getElementById('sessionPauseBtn').textContent = 'Pause';
  sessionStartTime = Date.now();
  sessionInterval = setInterval(updateSessionTimer, 100);
  sessionActive = true;
}

function updateSessionTimer() {
  sessionTimer = Math.floor((Date.now() - sessionStartTime) / 1000);
  document.getElementById('sessionTimer').textContent = formatTime(sessionTimer);
}

// ============================================================
// VOICE COUNT (sound-triggered auto-counting, optional add-on
// to the existing +1 / +108 manual buttons -- neither replaces
// the other; both can be used in the same session)
// ============================================================
let voiceCountActive = false;
let voiceAudioContext = null;
let voiceAnalyser = null;
let voiceMicStream = null;
let voiceAnimationFrame = null;
let voiceAboveThreshold = false;
let voiceLastCountTime = 0;
const VOICE_COOLDOWN_MS = 200;

document.getElementById('voiceCountToggle').addEventListener('click', () => {
  if (voiceCountActive) {
    stopVoiceCount();
  } else {
    startVoiceCount();
  }
});

document.getElementById('voiceSensitivitySlider').addEventListener('input', (e) => {
  document.getElementById('voiceSensitivityValue').textContent = e.target.value;
});

async function startVoiceCount() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Voice count is not supported on this browser');
    return;
  }

  try {
    voiceMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    console.error('Microphone access error:', err);
    showToast('Microphone permission denied');
    return;
  }

  voiceAudioContext = new (window.AudioContext || window.webkitAudioContext)();
  const source = voiceAudioContext.createMediaStreamSource(voiceMicStream);
  voiceAnalyser = voiceAudioContext.createAnalyser();
  voiceAnalyser.fftSize = 1024;
  source.connect(voiceAnalyser);

  voiceCountActive = true;
  voiceAboveThreshold = false;
  voiceLastCountTime = 0;

  document.getElementById('voiceCountToggle').textContent = '🎤 Disable Voice Count';
  document.getElementById('voiceCountStatus').classList.remove('hidden');
  document.getElementById('voiceSensitivityWrap').classList.remove('hidden');

  monitorVoiceLevel();
}

function stopVoiceCount() {
  voiceCountActive = false;

  if (voiceAnimationFrame) {
    cancelAnimationFrame(voiceAnimationFrame);
    voiceAnimationFrame = null;
  }
  if (voiceMicStream) {
    voiceMicStream.getTracks().forEach(track => track.stop());
    voiceMicStream = null;
  }
  if (voiceAudioContext) {
    voiceAudioContext.close().catch(() => {});
    voiceAudioContext = null;
  }
  voiceAnalyser = null;

  document.getElementById('voiceCountToggle').textContent = '🎤 Enable Voice Count';
  document.getElementById('voiceCountStatus').classList.add('hidden');
  document.getElementById('voiceSensitivityWrap').classList.add('hidden');
}

function monitorVoiceLevel() {
  if (!voiceCountActive || !voiceAnalyser) return;

  const data = new Uint8Array(voiceAnalyser.fftSize);
  voiceAnalyser.getByteTimeDomainData(data);

  let sumSquares = 0;
  for (let i = 0; i < data.length; i++) {
    const normalized = (data[i] - 128) / 128;
    sumSquares += normalized * normalized;
  }
  const rms = Math.sqrt(sumSquares / data.length);

  const sensitivity = parseInt(document.getElementById('voiceSensitivitySlider').value) || 5;
  const threshold = 0.11 - (sensitivity * 0.008);

  // Count on the cooldown tick whenever sound is sustained above threshold,
  // not just on the first below->above transition. Fast, continuous chanting
  // with no gap between repetitions never dips below threshold, so gating
  // purely on a rising edge would only ever count once for the whole burst.
  // Pacing counts to the cooldown while sustained approximates repetition
  // rate instead -- the cooldown is the practical ceiling on how fast this
  // can count (default ~5/sec), which is a real limit of volume-based
  // detection, not word-boundary detection.
  const now = Date.now();
  voiceAboveThreshold = rms > threshold;

  if (voiceAboveThreshold && (now - voiceLastCountTime) > VOICE_COOLDOWN_MS) {
    incrementSessionCount(1);
    voiceLastCountTime = now;
  }

  voiceAnimationFrame = requestAnimationFrame(monitorVoiceLevel);
}

// ============================================================
// SETTINGS
// ============================================================
document.getElementById('resetGoalBtn').addEventListener('click', () => {
  document.getElementById('lifetimeGoalInput').value = '1';
});

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  const goalInput = parseFloat(document.getElementById('lifetimeGoalInput').value);
  if (!goalInput || goalInput < 1) {
    showToast('Lifetime Goal must be at least 1 Billion');
    return;
  }

  userData.startingCount = parseInt(document.getElementById('startingCountInput').value) || 0;
  userData.defaultMalaSize = parseInt(document.getElementById('defaultMalaSizeInput').value) || 108;
  userData.lifetimeGoal = Math.round(goalInput * BILLION);

  await saveUserData();
  showToast('Settings saved');
  closeAllModals();
  refreshUI();
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
let deferredPrompt;

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallPrompt();
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
});

function showInstallPrompt() {
  if (deferredPrompt) {
    const card = document.createElement('div');
    card.className = 'card';
    card.style.background = 'linear-gradient(160deg, #ffd699 0%, #f3ddb8 140%)';
    card.style.marginBottom = '16px';
    card.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div>
          <div class="card-heading">Install RamNaam Sankalp</div>
          <p style="font-size: 14px; color: var(--text-primary); margin: 8px 0 0;">Add to your home screen for quick access</p>
        </div>
        <button id="installBtn" class="btn btn-primary" style="white-space: nowrap; margin-left: 12px;">Install</button>
      </div>
    `;

    const content = document.querySelector('.content');
    if (content && content.firstChild) {
      content.insertBefore(card, content.firstChild);
    }

    document.getElementById('installBtn').addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          deferredPrompt = null;
          card.remove();
        }
      }
    });
  }
}
