// app.js - enhanced UI with month navigation, today highlight, multi-select

// quick test at top of app.js
if (window.db) {
  console.log('Firestore ready:', window.db);
} else {
  console.warn('Firestore not found on window.db — check firebase init script');
}


document.addEventListener('DOMContentLoaded', () => {
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

  const STORAGE_KEY = 'gym_attendance_v1';
  let selectedDates = new Set();
  let viewDate = new Date(); // current view month

  function loadAttendance(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e){ console.error('Error parsing attendance', e); return {}; }
  }
  function saveAttendance(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  function formatMonthLabel(date){
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  }

  // helper: convert "YYYY-MM-DD" -> "DD-MMM-YY"
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
  
  // replace your existing updateSelectedDisplay() with this
  function updateSelectedDisplay(){
    if(selectedDates.size === 0){
      selectedDateEl.textContent = 'Selected: none';
    } else {
      // sort by ISO date so chronological order is preserved
      const arr = Array.from(selectedDates).sort();
      // map to DD-MMM-YY
      const formatted = arr.map(d => formatDisplayDate(d));
      selectedDateEl.textContent = 'Selected: ' + formatted.join(', ');
    }
  }


  // animate month change
  function animateMonthChange(direction, callback){
    calendarEl.style.transition = 'transform 260ms cubic-bezier(.2,.9,.2,1), opacity 200ms';
    calendarEl.style.opacity = '0';
    calendarEl.style.transform = `translateX(${direction * 20}px)`;
    setTimeout(() => {
      callback();
      calendarEl.style.transform = `translateX(${-direction * 20}px)`;
      setTimeout(() => {
        calendarEl.style.opacity = '1';
        calendarEl.style.transform = 'translateX(0)';
        setTimeout(() => {
          calendarEl.style.transition = '';
        }, 260);
      }, 20);
    }, 200);
  }

  function buildCalendarFor(year, month){
    calendarEl.innerHTML = '';
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();
    const attendance = loadAttendance();
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

  function buildCalendar(){
    buildCalendarFor(viewDate.getFullYear(), viewDate.getMonth());
  }

  function changeMonth(delta){
    const dir = delta; // -1 or +1
    viewDate.setMonth(viewDate.getMonth() + delta);
    // clear selection when changing months
    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();
    animateMonthChange(dir, buildCalendar);
  }

  function mark(status){
    if(selectedDates.size === 0){ alert('Please click one or more dates first.'); return; }
    const attendance = loadAttendance();
    const changed = [];
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
    saveAttendance(attendance);
    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();
    // subtle confirmation
    const msg = `Marked ${changed.length} day(s) as ${status}`;
    console.log(msg);
    // small non-blocking toast
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

  btnPresent.addEventListener('click', () => mark('present'));
  btnAbsent.addEventListener('click', () => mark('absent'));
  btnPrev.addEventListener('click', () => changeMonth(-1));
  btnNext.addEventListener('click', () => changeMonth(1));

  // initial render
  buildCalendar();
});
