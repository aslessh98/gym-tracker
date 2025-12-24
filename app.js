// app.js - DOM ready multi-select calendar with localStorage

document.addEventListener('DOMContentLoaded', () => {
  const calendarEl = document.getElementById('calendar');
  const monthLabelEl = document.getElementById('month-label');
  const selectedDateEl = document.getElementById('selected-date');
  const btnPresent = document.getElementById('mark-present');
  const btnAbsent = document.getElementById('mark-absent');

  if(!calendarEl || !monthLabelEl || !selectedDateEl || !btnPresent || !btnAbsent){
    console.error('One or more required DOM elements are missing. Check index.html IDs.');
    return;
  }

  const STORAGE_KEY = 'gym_attendance_v1';
  let selectedDates = new Set();

  function loadAttendance(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    }catch(e){
      console.error('Error parsing attendance from localStorage', e);
      return {};
    }
  }

  function saveAttendance(obj){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  function formatMonthLabel(date){
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${monthNames[date.getMonth()]}-${date.getFullYear()}`;
  }

  function updateSelectedDisplay(){
    if(selectedDates.size === 0){
      selectedDateEl.textContent = 'Selected: none';
    } else {
      const arr = Array.from(selectedDates).sort();
      selectedDateEl.textContent = 'Selected: ' + arr.join(', ');
    }
  }

  function buildCalendar(){
    calendarEl.innerHTML = '';
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const totalDays = last.getDate();
    const prevLast = new Date(year, month, 0).getDate();
    const attendance = loadAttendance();

    monthLabelEl.textContent = formatMonthLabel(now);

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
    console.log('Calendar built for', monthLabelEl.textContent);
  }

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
      const el = document.querySelector(`.day[data-date="${dateStr}"]`);
      if(el){
        el.classList.remove('present','absent');
        if(status === 'present') el.classList.add('present');
        if(status === 'absent') el.classList.add('absent');
      }
    });
    saveAttendance(attendance);

    // clear selection
    document.querySelectorAll('.day.selected').forEach(n => n.classList.remove('selected'));
    selectedDates.clear();
    updateSelectedDisplay();

    console.log('Marked', changed.length, 'days as', status);
    alert('Marked ' + changed.length + ' day(s) as ' + status);
  }

  btnPresent.addEventListener('click', () => mark('present'));
  btnAbsent.addEventListener('click', () => mark('absent'));

  buildCalendar();
});
