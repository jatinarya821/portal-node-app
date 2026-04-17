import { api } from '/public/js/api.js'
import { byId, renderApp } from '/public/js/utils.js'

let monthCursor = new Date()
let hearings = []

function formatMonth(date) {
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function tableRows() {
  return hearings
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((h) => `<tr><td><a href="/case-detail?id=${h.caseId?._id || h.caseId}">${h.caseId?.caseNumber || '-'}</a></td><td>${h.date}</td><td>${h.time}</td><td>${h.courtroom}</td><td><span class="badge">${h.status}</span></td></tr>`)
    .join('') || '<tr><td colspan="5">No hearings found</td></tr>'
}

function calendarGrid(date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1)
  const days = new Date(year, month + 1, 0).getDate()
  const leading = (firstDay.getDay() + 6) % 7

  const boxes = []
  for (let i = 0; i < leading; i += 1) boxes.push('<div class="day"></div>')

  for (let d = 1; d <= days; d += 1) {
    const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const hits = hearings.filter((h) => h.date === iso)
    boxes.push(`<div class="day"><b>${d}</b>${hits.map((h) => `<div><span class="dot"></span>${h.caseId?.caseNumber || '-'}</div>`).join('')}</div>`)
  }

  return boxes.join('')
}

function renderCalendar() {
  byId('month-label').textContent = formatMonth(monthCursor)
  byId('calendar').innerHTML = calendarGrid(monthCursor)
}

function markup() {
  return `
    <div class="grid">
      <section class="card full">
        <h3>Hearing Schedule List</h3>
        <table class="table">
          <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Courtroom</th><th>Status</th></tr></thead>
          <tbody id="hearing-body">${tableRows()}</tbody>
        </table>
      </section>

      <section class="card full">
        <div class="row" style="justify-content:space-between">
          <h3>Interactive Calendar</h3>
          <div class="row">
            <button id="prev-month" class="secondary">Previous</button>
            <strong id="month-label"></strong>
            <button id="next-month" class="secondary">Next</button>
          </div>
        </div>
        <div class="small" style="margin:0.3rem 0 0.7rem">Mon Tue Wed Thu Fri Sat Sun</div>
        <div id="calendar" class="calendar"></div>
      </section>
    </div>
  `
}

async function init() {
  renderApp('/hearings', 'Hearings', markup())
  byId('prev-month').addEventListener('click', () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
    renderCalendar()
  })

  byId('next-month').addEventListener('click', () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
    renderCalendar()
  })

  try {
    const res = await api.get('/hearings')
    hearings = res.items || []
    byId('hearing-body').innerHTML = tableRows()
    renderCalendar()
  } catch (error) {
    byId('calendar').innerHTML = `<p>Failed to load hearings: ${error.message}</p>`
  }
}

init()
