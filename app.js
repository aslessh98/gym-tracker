// Simple calendar + localStorage attendance demo with multi-select
// Date format used: YYYY-MM-DD

const calendarEl = document.getElementById('calendar');
const monthLabelEl = document.getElementById('month-label');
const selectedDateEl = document.getElementById('selected-date');
const btnPresent = document.getElementById('mark-present');
const btnAbsent = document.getElementById('mark-absent');

const STORAGE_KEY = 'gym_attendance_v1';
let selectedDates = new Set(); // holds 'YYYY-MM-DD' strings

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

// Format month label MMM-YYYY
function formatMonthLabel(date){
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
}

// Update the Selected: line
function updateSelectedDisplay(){
  if(selectedDates.size === 0){
    selectedDateEl.textContent = 'Selected: none';
  } else {
    const arr = Array.from(selectedDates).sort();
    selectedDateEl.textContent = 'Selected: ' + arr.join(', ');
  }
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

  // set month label
  monthLabelEl.textContent = formatMonthLabel(now);

  // 6 rows of 7 = 42 cells
  for(let i=0;i<42;i++){
    const cell = document.createElement('div');
    cell.className = 'day';
    // compute date number and whether it's in this month
    const dayIndex = i - startDay + 1;
    if(dayIndex <= 0){
      // previous month
      const d = prevLast + dayIndex;
      cell.textContent = d;
      cell.classList.add('other-month');
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
      const cellDate = `${yyyy}-${mm}-${dd}`;
      cell.dataset.date = cellDate;

      // color if attendance exists
      const status = attendance[cellDate];
      if(status === 'present') cell.classList.add('present');
      if(status === 'absent') cell.classList.add('absent');

      // click to toggle selection (multi-select)
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

  // restore any previously selected dates that are in this month (optional)
  updateSelectedDisplay();
}

// Mark all selected dates as present or absent
function mark(status){
  if(selectedDates.size === 0){
    alert('Please click one or more dates first.');
    return;
  }
  const attendance = loadAttendance();
  const changed = [];
  selectedDates.forEach(dateStr => {
    attendance[dateStr] = status;
    changed.push(dateStr);
    // update UI cell if present
    const el = document.querySelector(`.day[data-date="${dateStr}"]`);
    if(el){
      el.classList.remove('present','absent');
      if(status === 'present') el.classList.add('present');
      if(status === 'absent') el.classList.add('absent');
    }
  });
  saveAttendance(attendance);

  // Optionally clear selection after marking. If you want to keep selection, remove the next block.
  document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
  selectedDates.clear();
  updateSelectedDisplay();

  alert('Marked ' + changed.length + ' day(s) as ' + status);
}

btnPresent.addEventListener('click', () => mark('present'));
btnAbsent.addEventListener('click', () => mark('absent'));

// initial render
buildCalendar();
