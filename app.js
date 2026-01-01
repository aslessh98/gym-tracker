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

  console.log("initApp started");
  
  const {
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged,
    getRedirectResult,
    GoogleAuthProvider,
    signInWithRedirect,
    signInWithPopup,
    signOut
  } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
  
  // make sure persistence is set
  await setPersistence(window.auth, browserLocalPersistence);
  console.log("Auth persistence set to LOCAL");
  
  // listen for auth state changes
  onAuthStateChanged(window.auth, (user) => {
    if (user) {
      console.log("✅ User signed in:", user.uid);
      // update UI here (hide sign-in, show sign-out, reload calendar, etc.)
    } else {
      console.log("❌ No user signed in");
      // update UI here (show sign-in, hide sign-out, fallback to localStorage)
    }
  });
  
  // handle redirect result (needed if you use signInWithRedirect)
  getRedirectResult(window.auth)
    .then((result) => {
      if (result?.user) {
        console.log("Signed in via redirect:", result.user.uid);
      }
    })
    .catch((err) => {
      console.error("Redirect sign-in error:", err);
    });
  
  // attach button handlers if you have them
  const signInBtn = document.getElementById("sign-in-google");
  const signOutBtn = document.getElementById("sign-out");
  
  if (signInBtn) {
    signInBtn.addEventListener("click", () => {
      const provider = new GoogleAuthProvider();
      // choose one: redirect or popup
      signInWithRedirect(window.auth, provider);
      // OR: signInWithPopup(window.auth, provider);
    });
  }
  
  if (signOutBtn) {
    signOutBtn.addEventListener("click", () => {
      signOut(window.auth);
    });
  }

  
  // DOM elements
  const calendarEl = document.getElementById('calendar');
  const monthLabelEl = document.getElementById('month-label');
  const selectedDateEl = document.getElementById('selected-date');
  const btnPresent = document.getElementById('mark-present');
  const btnAbsent = document.getElementById('mark-absent');
  const btnPrev = document.getElementById('prev-month');
  const btnNext = document.getElementById('next-month');

  if(!calendarEl || !monthLabelEl || !selectedDateEl || !btnPresent || !btnAbsent || !btnPrev || !btnNext){
    console.error('Missing DOM elements. Check index.html IDs.');
    return;
  }

  // Optional auth UI container (if present in your HTML)
  const authArea = document.getElementById('auth-area');

  const STORAGE_KEY = 'gym_attendance_v1';
  let selectedDates = new Set();
  let viewDate = new Date(); // current view month

  // LocalStorage fallback helpers
  function loadAttendanceLocal(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e){ console.error('Error parsing attendance', e); return {}; }
  }
  function saveAttendanceLocal(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  // Firestore helpers (dynamic imports so we can use CDN modules)
  async function saveAttendanceToFirestore(uid, dateISO, status){
    try{
      const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const ref = doc(window.db, 'users', uid, 'attendance', dateISO);
      await setDoc(ref, { status: status, updatedAt: Date.now() });
      return true;
    } catch(err){
      console.error('Failed to save to Firestore', err);
      return false;
    }
  }

  async function loadAttendanceFromFirestore(uid, monthPrefix){
    try{
      const { collection, query, where, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');
      const start = monthPrefix + '-01';
      const end = monthPrefix + '-31';
      const q = query(collection(window.db, 'users', uid, 'attendance'),
                      where('__name__', '>=', start),
                      where('__name__', '<=', end));
      const snap = await getDocs(q);
      const out = {};
      snap.forEach(docSnap => {
        const data = docSnap.data();
        out[docSnap.id] = data.status;
      });
      return out;
    } catch(err){
      console.error('Failed to load from Firestore', err);
      return {};
    }
  }

  // Format helpers
  function formatMonthLabel(date){
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  }

  function formatDisplayDate(isoDate) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parts = isoDate.split('-'); // [YYYY, MM, DD]
    if(parts.length !== 3) return isoDate;
    const yyyy = parts[0];
    const mm = parseInt(parts[1], 10) - 1;
    const dd = parts[2];
    const shortYear = yyyy.slice(-2);
    return `${dd}-${months[mm]}-${shortYear}`;
  }

  function updateSelectedDisplay(){
    if(selectedDates.size === 0){
      selectedDateEl.textContent = 'Selected: none';
    } else {
      const arr = Array.from(selectedDates).sort();
      const formatted = arr.map(d => formatDisplayDate(d));
      selectedDateEl.textContent = 'Selected: ' + formatted.join(', ');
    }
  }

  // animate month change (supports async callback)
  async function animateMonthChange(direction, callback){
    calendarEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms';
    calendarEl.style.opacity = '0';
    calendarEl.style.transform = `translateX(${direction * 20}px)`;
    await new Promise(r => setTimeout(r, 200));
    await callback();
    calendarEl.style.transform = `translateX(${-direction * 20}px)`;
    await new Promise(r => setTimeout(r, 20));
    calendarEl.style.opacity = '1';
    calendarEl.style.transform = 'translateX(0)';
    await new Promise(r => setTimeout(r, 260));
    calendarEl.style.transition = '';
  }

  // Build calendar for a given year/month. This is async because it may load from Firestore.
  async function buildCalendarFor(year, month){
    calendarEl.innerHTML = '';
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();

    // Default to local attendance
    let attendance = loadAttendanceLocal();

    // If signed in, try to load from Firestore for this month
    const user = window.auth && window.auth.currentUser;
    if(user){
      const monthPrefix = `${year}-${String(month+1).padStart(2,'0')}`;
      const remote = await loadAttendanceFromFirestore(user.uid, monthPrefix);
      // merge remote over local so remote wins
      attendance = Object.assign({}, attendance, remote);
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    monthLabelEl.textContent = formatMonthLabel(new Date(year, month, 1));

    for(let i=0;i<42;i++){
      const cell = document.createElement('div');
      cell.className = 'day';
      const dayIndex = i - startDay + 1;
      if(dayIndex <= 0){
        const d = prevLast + dayIndex;
        cell.textContent = d;
        cell.classList.add('other-month');
      } else if(dayIndex > totalDays){
        const d = dayIndex - totalDays;
        cell.textContent = d;
        cell.classList.add('other-month');
      } else {
        const d = dayIndex;
        cell.textContent = d;
        const yyyy = year;
        const mm = String(month + 1).padStart(2,'0');
        const dd = String(d).padStart(2,'0');
        const cellDate = `${yyyy}-${mm}-${dd}`;
        cell.dataset.date = cellDate;

        const status = attendance[cellDate];
        if(status === 'present') cell.classList.add('present');
        if(status === 'absent') cell.classList.add('absent');
        if(cellDate === todayStr) cell.classList.add('today');

        // toggle selection
        cell.addEventListener('click', () => {
          if(selectedDates.has(cellDate)){
            selectedDates.delete(cellDate);
            cell.classList.remove('selected');
          } else {
            selectedDates.add(cellDate);
            cell.classList.add('selected');
          }
          updateSelectedDisplay();
        });
      }
      calendarEl.appendChild(cell);
    }
    updateSelectedDisplay();
  }

  async function buildCalendar(){
    await buildCalendarFor(viewDate.getFullYear(), viewDate.getMonth());
  }

  function changeMonth(delta){
    const dir = delta; // -1 or +1
    viewDate.setMonth(viewDate.getMonth() + delta);
    // clear selection when changing months
    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();
    // animateMonthChange accepts async callback
    animateMonthChange(dir, buildCalendar);
  }

  // Mark function: writes to Firestore when signed in, otherwise localStorage
  async function mark(status){
    if(selectedDates.size === 0){ alert('Please click one or more dates first.'); return; }
    const user = window.auth && window.auth.currentUser;
    const changed = [];

    if(user){
      const uid = user.uid;
      // write each date to Firestore (simple loop; small sets are fine)
      for(const dateStr of selectedDates){
        const ok = await saveAttendanceToFirestore(uid, dateStr, status);
        if(ok){
          changed.push(dateStr);
          const el = document.querySelector(`.day[data-date="${dateStr}"]`);
          if(el){
            el.classList.remove('present','absent');
            if(status === 'present') el.classList.add('present');
            if(status === 'absent') el.classList.add('absent');
          }
        } else {
          showToast('Failed to save some dates. Check console.');
        }
      }
    } else {
      // fallback to localStorage
      const attendance = loadAttendanceLocal();
      selectedDates.forEach(dateStr => {
        attendance[dateStr] = status;
        changed.push(dateStr);
        const el = document.querySelector(`.day[data-date="${dateStr}"]`);
        if(el){
          el.classList.remove('present','absent');
          if(status === 'present') el.classList.add('present');
          if(status === 'absent') el.classList.add('absent');
        }
      });
      saveAttendanceLocal(attendance);
    }

    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();
    const msg = `Marked ${changed.length} day(s) as ${status}`;
    console.log(msg);
    showToast(msg);
  }

  // small toast helper
  function showToast(text){
    let t = document.getElementById('toast-msg');
    if(!t){
      t = document.createElement('div');
      t.id = 'toast-msg';
      t.style.position = 'fixed';
      t.style.left = '50%';
      t.style.bottom = '28px';
      t.style.transform = 'translateX(-50%)';
      t.style.background = 'rgba(11,18,32,0.9)';
      t.style.color = 'white';
      t.style.padding = '10px 14px';
      t.style.borderRadius = '10px';
      t.style.fontWeight = '700';
      t.style.zIndex = '9999';
      t.style.opacity = '0';
      t.style.transition = 'opacity 220ms';
      document.body.appendChild(t);
    }
    t.textContent = text;
    t.style.opacity = '1';
    clearTimeout(t._hideTimer);
    t._hideTimer = setTimeout(()=>{ t.style.opacity = '0'; }, 1600);
  }

  // Attach UI handlers
  btnPresent.addEventListener('click', () => mark('present'));
  btnAbsent.addEventListener('click', () => mark('absent'));
  btnPrev.addEventListener('click', () => changeMonth(-1));
  btnNext.addEventListener('click', () => changeMonth(1));

  // --- Authentication UI and listener ---
  // Create simple sign-in/out buttons if authArea exists


  // React to auth state changes: reload calendar when user signs in/out
  if(window.auth && typeof window.auth.onAuthStateChanged === 'function'){
    window.auth.onAuthStateChanged(async (user) => {
      if(authArea){
        const signInBtn = document.getElementById('sign-in-google');
        const signOutBtn = document.getElementById('sign-out');
        if(user){
          if(signInBtn) signInBtn.style.display = 'none';
          if(signOutBtn) signOutBtn.style.display = 'inline-block';
        } else {
          if(signInBtn) signInBtn.style.display = 'inline-block';
          if(signOutBtn) signOutBtn.style.display = 'none';
        }
      }
      // reload current month (buildCalendar is async)
      await buildCalendar();
    });
  }

  // initial render (will load local or remote depending on auth state)
  await buildCalendar();
}
