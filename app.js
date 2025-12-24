// Simple calendar + localStorage attendance demo
// Date format used: YYYY-MM-DD

const calendarEl = document.getElementById('calendar');
const selectedDateEl = document.getElementById('selected-date');
const btnPresent = document.getElementById('mark-present');
const btnAbsent = document.getElementById('mark-absent');

let selected = null; // 'YYYY-MM-DD'
const STORAGE_KEY = 'gym_attendance_v1';

// Load saved attendance from localStorage
function loadAttendance(){
  try{
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  }catch(e){
    return {};
  }
}

function saveAttendance(obj){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
}

// Build calendar for current month
function buildCalendar(){
  calendarEl.innerHTML = '';
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-based
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay(); // 0=Sun
  const totalDays = last.getDate();

  // show previous month's tail to fill week
  const prevLast = new Date(year, month, 0).getDate();

  const attendance = loadAttendance();

  // 6 rows of 7 = 42 cells (covers all month layouts)
  for(let i=0;i<42;i++){
    const cell = document.createElement('div');
    cell.className = 'day';
    // compute date number and whether it's in this month
    const dayIndex = i - startDay + 1;
    let cellDate = null;
    if(dayIndex <= 0){
      // previous month
      const d = prevLast + dayIndex;
      cell.textContent = d;
      cell.classList.add('other-month');
      // compute date string for prev month if needed (not required)
    } else if(dayIndex > totalDays){
      // next month
      const d = dayIndex - totalDays;
      cell.textContent = d;
      cell.classList.add('other-month');
    } else {
      // current month day
      const d = dayIndex;
      cell.textContent = d;
      const yyyy = year;
      const mm = String(month + 1).padStart(2,'0');
      const dd = String(d).padStart(2,'0');
      cellDate = `${yyyy}-${mm}-${dd}`;
      cell.dataset.date = cellDate;

      // color if attendance exists
      const status = attendance[cellDate];
      if(status === 'present') cell.classList.add('present');
      if(status === 'absent') cell.classList.add('absent');

      // click to select
      cell.addEventListener('click', () => {
        document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
        cell.classList.add('selected');
        selected = cellDate;
        selectedDateEl.textContent = 'Selected: ' + selected;
      });
    }
    calendarEl.appendChild(cell);
  }
}

// Mark selected date as present or absent
function mark(status){
  if(!selected){
    alert('Please click a date first.');
    return;
  }
  const attendance = loadAttendance();
  attendance[selected] = status;
  saveAttendance(attendance);
  // Update UI immediately
  document.querySelectorAll('.day').forEach(el => {
    if(el.dataset.date === selected){
      el.classList.remove('present','absent');
      if(status === 'present') el.classList.add('present');
      if(status === 'absent') el.classList.add('absent');
    }
  });

  // OPTIONAL: send to backend instead of localStorage
  // fetch('https://YOUR_BACKEND_ENDPOINT/mark', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ date: selected, status })
  // }).then(r => r.json()).then(console.log).catch(console.error);

  alert('Marked ' + selected + ' as ' + status);
}

btnPresent.addEventListener('click', () => mark('present'));
btnAbsent.addEventListener('click', () => mark('absent'));

// initial render
buildCalendar();
