// app.js - enhanced UI with month navigation, today highlight, multi-select
// Final updated file with Firestore + Auth integration and safe startup sequencing.

// Helper: promise that resolves when DOM is ready
console.log('app.js loaded');

const domReady = new Promise(resolve => {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => resolve());
  } else {
    resolve();
  }
});





// Helper: promise that resolves when Firebase dispatches the event or window.db exists
const firebaseReady = new Promise(resolve => {
  if (window.db) {
    resolve();
  } else {
    window.addEventListener('firebase-ready', () => resolve(), { once: true });
  }
});

// Start when both are ready
Promise.all([domReady, firebaseReady]).then(() => {
  console.log('DOM and Firebase ready — starting app');
  initApp();
}).catch(err => {
  console.error('Failed to start app:', err);
});

async function initApp() {
  console.log('🚀 initApp started');

  // ---------- Firebase Auth ----------
  const {
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithRedirect,
    signOut
  } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');

  await setPersistence(window.auth, browserLocalPersistence);
  console.log('🔐 Auth persistence set to LOCAL');

  // ---------- DOM ----------
  const calendarEl = document.getElementById('calendar');
  const monthLabelEl = document.getElementById('month-label');
  const selectedDateEl = document.getElementById('selected-date');
  const btnPresent = document.getElementById('mark-present');
  const btnAbsent = document.getElementById('mark-absent');
  const btnPrev = document.getElementById('prev-month');
  const btnNext = document.getElementById('next-month');
  const authArea = document.getElementById('auth-area');

  if (!calendarEl || !monthLabelEl || !selectedDateEl ||
      !btnPresent || !btnAbsent || !btnPrev || !btnNext) {
    console.error('Missing DOM elements. Check index.html IDs.');
    return;
  }

  // ---------- Auth UI ----------
  authArea.innerHTML = '';

  const signInBtn = document.createElement('button');
  signInBtn.textContent = 'Sign in with Google';
  signInBtn.className = 'btn';

  const signOutBtn = document.createElement('button');
  signOutBtn.textContent = 'Sign out';
  signOutBtn.className = 'btn';
  signOutBtn.style.display = 'none';

  authArea.appendChild(signInBtn);
  authArea.appendChild(signOutBtn);

  signInBtn.addEventListener('click', async () => {
    console.log('🔑 Google sign-in started');
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(window.auth, provider);
  });

  signOutBtn.addEventListener('click', async () => {
    await signOut(window.auth);
  });

  // ---------- State ----------
  const STORAGE_KEY = 'gym_attendance_v1';
  let selectedDates = new Set();
  let viewDate = new Date();

  // ---------- Auth state (SOURCE OF TRUTH) ----------
  onAuthStateChanged(window.auth, async (user) => {
    if (user) {
      console.log('✅ Auth restored. UID:', user.uid);
      signInBtn.style.display = 'none';
      signOutBtn.style.display = 'inline-block';
    } else {
      console.log('❌ No user signed in');
      signInBtn.style.display = 'inline-block';
      signOutBtn.style.display = 'none';
    }

    await buildCalendar();
  });

  // ---------- Local storage helpers ----------
  function loadAttendanceLocal() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveAttendanceLocal(obj) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  // ---------- Firestore helpers ----------
  async function saveAttendanceToFirestore(uid, dateISO, status) {
    const { doc, setDoc } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
    await setDoc(doc(window.db, 'users', uid, 'attendance', dateISO), {
      status,
      updatedAt: Date.now()
    });
  }

  async function loadAttendanceFromFirestore(uid, monthPrefix) {
    const { collection, query, where, getDocs } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    const q = query(
      collection(window.db, 'users', uid, 'attendance'),
      where('__name__', '>=', monthPrefix + '-01'),
      where('__name__', '<=', monthPrefix + '-31')
    );

    const snap = await getDocs(q);
    const out = {};
    snap.forEach(d => out[d.id] = d.data().status);
    return out;
  }

  // ---------- Calendar ----------
  async function buildCalendar() {
    calendarEl.innerHTML = '';
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    let attendance = loadAttendanceLocal();
    const user = window.auth.currentUser;

    if (user) {
      const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
      attendance = { ...attendance, ...(await loadAttendanceFromFirestore(user.uid, prefix)) };
    }

    monthLabelEl.textContent =
      viewDate.toLocaleString('default', { month: 'short', year: 'numeric' });

    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < first + days; i++) {
      const cell = document.createElement('div');
      cell.className = 'day';

      if (i >= first) {
        const d = i - first + 1;
        cell.textContent = d;
        const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        cell.dataset.date = iso;

        if (attendance[iso] === 'present') cell.classList.add('present');
        if (attendance[iso] === 'absent') cell.classList.add('absent');

        cell.addEventListener('click', () => {
          cell.classList.toggle('selected');
          selectedDates.has(iso) ? selectedDates.delete(iso) : selectedDates.add(iso);
          selectedDateEl.textContent =
            selectedDates.size ? 'Selected: ' + [...selectedDates].join(', ') : 'Selected: none';
        });
      }

      calendarEl.appendChild(cell);
    }
  }

  // ---------- Actions ----------
  async function mark(status) {
    const user = window.auth.currentUser;
    const attendance = loadAttendanceLocal();

    for (const date of selectedDates) {
      if (user) await saveAttendanceToFirestore(user.uid, date, status);
      attendance[date] = status;
    }

    saveAttendanceLocal(attendance);
    selectedDates.clear();
    await buildCalendar();
  }

  btnPresent.onclick = () => mark('present');
  btnAbsent.onclick = () => mark('absent');
  btnPrev.onclick = () => { viewDate.setMonth(viewDate.getMonth() - 1); buildCalendar(); };
  btnNext.onclick = () => { viewDate.setMonth(viewDate.getMonth() + 1); buildCalendar(); };
}

