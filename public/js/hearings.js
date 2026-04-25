import { api } from '/public/js/api.js'
import { byId, renderApp, toast } from '/public/js/utils.js'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

let monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
let viewMode = 'list'
let rawHearings = []
let caseLookup = new Map()
let hearingRecords = []

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'default'
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeDate(value) {
  const raw = String(value || '').trim().slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null

  const date = new Date(`${raw}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function parseDateTime(dateValue, timeValue) {
  const date = String(dateValue || '').trim().slice(0, 10)
  if (!date) return null

  const rawTime = String(timeValue || '').trim()
  if (!rawTime) {
    const fallback = new Date(`${date}T23:59:59`)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  let candidate = null
  if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
    candidate = new Date(`${date}T${rawTime}:00`)
  } else if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(rawTime)) {
    candidate = new Date(`${date} ${rawTime.toUpperCase()}`)
  } else {
    candidate = new Date(`${date}T${rawTime}`)
  }

  if (Number.isNaN(candidate.getTime())) {
    return normalizeDate(date)
  }
  return candidate
}

function toIsoDate(value) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthLabel(date) {
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function formatDateLabel(value) {
  const date = normalizeDate(value)
  if (!date) return '-'
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatTimeLabel(value) {
  const raw = String(value || '').trim()
  if (!raw) return '-'

  if (/^\d{1,2}:\d{2}$/.test(raw)) {
    const [hours, minutes] = raw.split(':').map((chunk) => Number.parseInt(chunk, 10))
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const sample = new Date(2000, 0, 1, hours, minutes)
      return sample.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    }
  }

  return raw
}

function extractCaseId(item) {
  const value = item?.caseId?._id || item?.caseId || ''
  return value ? String(value) : ''
}

function buildAttendees(caseMeta = {}, titleFallback = '') {
  const attendees = []
  if (caseMeta.petitioner) attendees.push(caseMeta.petitioner)
  if (caseMeta.respondent) attendees.push(caseMeta.respondent)
  if (!attendees.length && titleFallback) attendees.push(titleFallback)
  if (!attendees.length) attendees.push('Registry Team')
  return attendees.slice(0, 3)
}

function normalizeHearings(items) {
  return (items || [])
    .map((item, index) => {
      const caseId = extractCaseId(item)
      const caseFromHearing = typeof item.caseId === 'object' && item.caseId ? item.caseId : {}
      const caseMeta = caseLookup.get(caseId) || {}
      const dateObj = normalizeDate(item.date)

      const status = item.status || 'Scheduled'
      const type = caseMeta.type || 'General'
      const caseNumber = caseFromHearing.caseNumber || caseMeta.caseNumber || 'Unassigned'
      const caseTitle = caseFromHearing.title || caseMeta.title || 'Case details unavailable'

      return {
        id: String(item._id || `${caseId}-${item.date || ''}-${item.time || ''}-${index}`),
        caseId,
        detailLink: caseId ? `/case-detail?id=${encodeURIComponent(caseId)}&tab=hearings` : '/cases',
        caseNumber,
        caseTitle,
        date: item.date || '',
        dateObj,
        dateIso: dateObj ? toIsoDate(dateObj) : '',
        when: parseDateTime(item.date, item.time),
        time: item.time || '',
        status,
        statusKey: slug(status),
        courtroom: item.courtroom || caseMeta.court || 'Courtroom 1',
        judge: caseMeta.judge || 'Not Assigned',
        type,
        attendees: buildAttendees(caseMeta, caseTitle),
      }
    })
    .sort((a, b) => {
      const aTime = a.when ? a.when.getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.when ? b.when.getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
}

function monthHearings() {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  return hearingRecords.filter((item) => item.dateObj && item.dateObj.getFullYear() === year && item.dateObj.getMonth() === month)
}

function thisWeekCount() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  return hearingRecords.filter((item) => item.dateObj && item.dateObj >= weekStart && item.dateObj < weekEnd).length
}

function monthNavigation(prefix) {
  return `
    <div class="hearings-month-nav">
      <button id="${prefix}-prev-month" class="secondary hearings-month-btn" type="button" aria-label="Previous month">Previous</button>
      <strong id="${prefix}-month-label" class="hearings-month-label"></strong>
      <button id="${prefix}-next-month" class="secondary hearings-month-btn" type="button" aria-label="Next month">Next</button>
    </div>
  `
}

function hearingCardMarkup(item) {
  return `
    <article class="hearing-item">
      <div class="hearing-item-head">
        <div>
          <a class="hearing-case-link" href="${item.detailLink}">${escapeHtml(item.caseNumber)}</a>
        </div>
        <div class="hearing-badges">
          <span class="badge hearings-pill hearings-status-${item.statusKey}">${escapeHtml(item.status)}</span>
          <span class="badge hearings-pill hearings-type-badge">${escapeHtml(item.type)}</span>
        </div>
      </div>

      <div class="hearing-details-grid">
        <div class="hearing-detail-cell">
          <span>Date</span>
          <b>${escapeHtml(formatDateLabel(item.date))}</b>
        </div>
        <div class="hearing-detail-cell">
          <span>Time</span>
          <b>${escapeHtml(formatTimeLabel(item.time))}</b>
        </div>
        <div class="hearing-detail-cell">
          <span>Courtroom</span>
          <b>${escapeHtml(item.courtroom || '-')}</b>
        </div>
        <div class="hearing-detail-cell">
          <span>Judge</span>
          <b>${escapeHtml(item.judge || '-')}</b>
        </div>
      </div>

      <div class="hearing-attendees">
        ${item.attendees.map((attendee) => `<span class="hearing-attendee">${escapeHtml(attendee)}</span>`).join('')}
      </div>
    </article>
  `
}

function listMarkup(items) {
  if (!items.length) {
    return '<p class="hearings-empty">No hearings scheduled for this month.</p>'
  }

  return items.map((item) => hearingCardMarkup(item)).join('')
}

function calendarMarkup() {
  const year = monthCursor.getFullYear()
  const month = monthCursor.getMonth()
  const first = new Date(year, month, 1)
  const leading = first.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const totalNeeded = leading + daysInMonth
  const cellCount = totalNeeded <= 35 ? 35 : 42
  const start = new Date(year, month, 1 - leading)
  const todayIso = toIsoDate(new Date())

  const byDate = new Map()
  monthHearings().forEach((item) => {
    if (!item.dateIso) return
    const bucket = byDate.get(item.dateIso) || []
    bucket.push(item)
    byDate.set(item.dateIso, bucket)
  })
  byDate.forEach((items) => {
    items.sort((a, b) => {
      const aTime = a.when ? a.when.getTime() : Number.MAX_SAFE_INTEGER
      const bTime = b.when ? b.when.getTime() : Number.MAX_SAFE_INTEGER
      return aTime - bTime
    })
  })

  const cells = []
  for (let i = 0; i < cellCount; i += 1) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toIsoDate(date)
    const isOutside = date.getMonth() !== month
    const isToday = iso === todayIso
    const items = isOutside ? [] : (byDate.get(iso) || [])
    const previews = items.slice(0, 2)
    const extraCount = Math.max(0, items.length - previews.length)

    cells.push(`
      <div class="hearings-calendar-cell${isOutside ? ' is-muted' : ''}${isToday ? ' is-today' : ''}">
        <div class="hearings-calendar-daynum">${date.getDate()}</div>
        <div class="hearings-day-list">
          ${previews
            .map((item) => `
              <div class="hearings-day-preview status-${item.statusKey}">
                <b>${escapeHtml(item.caseNumber)}</b>
                <span>${escapeHtml(formatTimeLabel(item.time))}</span>
              </div>
            `)
            .join('')}
          ${extraCount ? `<p class="hearings-more">+${extraCount} more</p>` : ''}
        </div>
      </div>
    `)
  }

  return cells.join('')
}

function markup() {
  return `
    <div class="hearings-page">
      <section class="card hearings-page-header">
        <div>
          <h2>Hearings Calendar</h2>
          <p class="small">Schedule and manage court hearings</p>
        </div>
        <div class="hearings-view-toggle" role="tablist" aria-label="Hearings view toggle">
          <button id="view-list-btn" class="hearings-view-btn active" type="button" role="tab" aria-selected="true">List View</button>
          <button id="view-calendar-btn" class="hearings-view-btn" type="button" role="tab" aria-selected="false">Calendar View</button>
        </div>
      </section>

      <section class="hearings-stats-grid">
        <article class="card hearings-stat hearings-stat-total">
          <p class="hearings-stat-label">Total This Month</p>
          <h3 id="stat-total-month" class="hearings-stat-value">0</h3>
        </article>
        <article class="card hearings-stat hearings-stat-scheduled">
          <p class="hearings-stat-label">Scheduled</p>
          <h3 id="stat-scheduled" class="hearings-stat-value">0</h3>
        </article>
        <article class="card hearings-stat hearings-stat-completed">
          <p class="hearings-stat-label">Completed</p>
          <h3 id="stat-completed" class="hearings-stat-value">0</h3>
        </article>
        <article class="card hearings-stat hearings-stat-week">
          <p class="hearings-stat-label">This Week</p>
          <h3 id="stat-week" class="hearings-stat-value">0</h3>
        </article>
      </section>

      <section id="hearings-list-view" class="card hearings-view-card">
        <div class="hearings-view-head">
          <h3>List View</h3>
          ${monthNavigation('list')}
        </div>
        <div id="hearing-list-content" class="hearing-list-grid"></div>
      </section>

      <section id="hearings-calendar-view" class="card hearings-view-card" hidden>
        <div class="hearings-view-head">
          <h3>Calendar View</h3>
          ${monthNavigation('calendar')}
        </div>
        <div class="hearings-calendar-head">
          ${WEEKDAY_LABELS.map((label) => `<span>${label}</span>`).join('')}
        </div>
        <div id="hearing-calendar-grid" class="hearings-calendar-grid"></div>
        <div class="hearings-legend">
          <span class="hearings-legend-item"><span class="hearings-legend-dot legend-scheduled"></span>Scheduled</span>
          <span class="hearings-legend-item"><span class="hearings-legend-dot legend-completed"></span>Completed</span>
          <span class="hearings-legend-item"><span class="hearings-legend-dot legend-adjourned"></span>Adjourned</span>
        </div>
      </section>
    </div>
  `
}

function syncView() {
  const listVisible = viewMode === 'list'
  byId('hearings-list-view').hidden = !listVisible
  byId('hearings-calendar-view').hidden = listVisible

  const listBtn = byId('view-list-btn')
  const calendarBtn = byId('view-calendar-btn')

  listBtn.classList.toggle('active', listVisible)
  calendarBtn.classList.toggle('active', !listVisible)
  listBtn.setAttribute('aria-selected', String(listVisible))
  calendarBtn.setAttribute('aria-selected', String(!listVisible))
}

function updateMonthLabels() {
  const label = formatMonthLabel(monthCursor)
  byId('list-month-label').textContent = label
  byId('calendar-month-label').textContent = label
}

function updateStats() {
  const monthItems = monthHearings()
  const scheduled = monthItems.filter((item) => item.statusKey === 'scheduled').length
  const completed = monthItems.filter((item) => item.statusKey === 'completed').length

  byId('stat-total-month').textContent = String(monthItems.length)
  byId('stat-scheduled').textContent = String(scheduled)
  byId('stat-completed').textContent = String(completed)
  byId('stat-week').textContent = String(thisWeekCount())
}

function renderList() {
  byId('hearing-list-content').innerHTML = listMarkup(monthHearings())
}

function renderCalendar() {
  byId('hearing-calendar-grid').innerHTML = calendarMarkup()
}

function renderAll() {
  updateMonthLabels()
  updateStats()
  renderList()
  renderCalendar()
  syncView()
}

function bindMonthNavigation(prefix) {
  byId(`${prefix}-prev-month`).addEventListener('click', () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1)
    renderAll()
  })

  byId(`${prefix}-next-month`).addEventListener('click', () => {
    monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1)
    renderAll()
  })
}

async function loadData() {
  const [hearingsResult, casesResult] = await Promise.allSettled([
    api.get('/hearings'),
    api.get('/cases'),
  ])

  if (hearingsResult.status !== 'fulfilled') {
    throw hearingsResult.reason
  }

  rawHearings = hearingsResult.value.items || []

  if (casesResult.status === 'fulfilled') {
    caseLookup = new Map((casesResult.value.items || []).map((item) => [String(item._id), item]))
  } else {
    caseLookup = new Map()
    toast('Case metadata unavailable. Showing basic hearing details only.')
  }

  hearingRecords = normalizeHearings(rawHearings)
}

async function init() {
  renderApp('/hearings', 'Hearings Calendar', markup())

  byId('view-list-btn').addEventListener('click', () => {
    viewMode = 'list'
    syncView()
  })

  byId('view-calendar-btn').addEventListener('click', () => {
    viewMode = 'calendar'
    syncView()
  })

  bindMonthNavigation('list')
  bindMonthNavigation('calendar')
  renderAll()

  try {
    await loadData()
    renderAll()
  } catch (error) {
    const message = `Failed to load hearings: ${error.message}`
    toast(message)
    byId('hearing-list-content').innerHTML = `<p class="hearings-empty">${escapeHtml(message)}</p>`
    byId('hearing-calendar-grid').innerHTML = `<p class="hearings-empty">${escapeHtml(message)}</p>`
  }
}

init()
