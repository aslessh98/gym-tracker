// app.js - month navigation + multi-select calendar with localStorage
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

  // viewDate holds the year and month currently displayed
  let viewDate = new Date(); // starts at current month

  function loadAttendance(){
    try{ return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
    catch(e){ console.error('Error parsing attendance', e); return {}; }
  }
  function saveAttendance(obj){ localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); }

  function formatMonthLabel(date){
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  }

  function updateSelectedDisplay(){
    if(selectedDates.size === 0) selectedDateEl.textContent = 'Selected: none';
    else selectedDateEl.textContent = 'Selected: ' + Array.from(selectedDates).sort().join(', ');
  }

  // Build calendar for a specific year and month (0-based month)
  function buildCalendarFor(year, month){
    calendarEl.innerHTML = '';
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();
    const attendance = loadAttendance();

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
    // delta = -1 for prev, +1 for next
    viewDate.setMonth(viewDate.getMonth() + delta);
    // clear selection when changing months (optional)
    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();
    buildCalendar();
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
    alert('Marked ' + changed.length + ' day(s) as ' + status);
  }

  btnPresent.addEventListener('click', () => mark('present'));
  btnAbsent.addEventListener('click', () => mark('absent'));
  btnPrev.addEventListener('click', () => changeMonth(-1));
  btnNext.addEventListener('click', () => changeMonth(1));

  // initial render
  buildCalendar();
});
