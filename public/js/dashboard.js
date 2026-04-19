import { api } from '/public/js/api.js'
import { renderApp } from '/public/js/utils.js'

const DashboardIcons = {
  fileText: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/></svg>',
  calendar: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  clock: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
  trendingUp: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 17l7-7 4 4 7-7"/><path d="M14 7h7v7"/></svg>',
  alert: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
}

function emptyMarkup(message) {
  return `<div class="card full"><p>${message}</p></div>`
}

function dateLabel(value) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function timeLabel(value) {
  if (!value) return 'TBA'
  const [hour, minute] = value.split(':').map((part) => Number.parseInt(part, 10))
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return value
  const d = new Date()
  d.setHours(hour)
  d.setMinutes(minute)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function statusClass(status) {
  const map = {
    Filed: 'status-filed',
    'Under Review': 'status-under-review',
    'Hearing Scheduled': 'status-hearing-scheduled',
    Adjourned: 'status-adjourned',
    Closed: 'status-closed',
  }

  return map[status] || 'status-default'
}

function markup(cases, hearings, documents) {
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const activeCases = cases.filter((item) => item.status !== 'Closed').length
  const upcomingHearings = hearings.filter((item) => item.date >= today).length
  const pendingReview = cases.filter((item) => item.status === 'Under Review').length
  const casesThisMonth = cases.filter((item) => {
    if (!item.createdAt) return false
    const filedAt = new Date(item.createdAt)
    return filedAt.getMonth() === currentMonth && filedAt.getFullYear() === currentYear
  }).length

  const recentCases = [...cases]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 5)

  const todaysHearings = [...hearings]
    .filter((item) => item.date === today)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5)

  const unassignedCases = cases.filter((item) => !item.judge || item.judge === 'Not Assigned').length
  const adjournedCases = cases.filter((item) => item.status === 'Adjourned').length
  const noRecentUploads = documents.filter((item) => item.uploadedOn === today).length === 0

  const alerts = []

  if (pendingReview > 0) {
    alerts.push({
      icon: DashboardIcons.clock,
      title: `${pendingReview} case${pendingReview > 1 ? 's' : ''} pending review`,
      description: 'Prioritize legal review to avoid hearing schedule delays.',
    })
  }

  if (unassignedCases > 0) {
    alerts.push({
      icon: DashboardIcons.alert,
      title: `${unassignedCases} case${unassignedCases > 1 ? 's' : ''} without assigned judge`,
      description: 'Assign benches before creating fresh hearing slots.',
    })
  }

  if (adjournedCases > 0) {
    alerts.push({
      icon: DashboardIcons.calendar,
      title: `${adjournedCases} adjourned matter${adjournedCases > 1 ? 's' : ''} require reschedule`,
      description: 'Update dates to keep advocates and registry teams aligned.',
    })
  }

  if (noRecentUploads) {
    alerts.push({
      icon: DashboardIcons.fileText,
      title: 'No documents uploaded today',
      description: 'Verify pending evidence filings and certified copies.',
    })
  }

  if (!alerts.length) {
    alerts.push({
      icon: DashboardIcons.trendingUp,
      title: 'Operations are stable',
      description: 'No critical alerts at this moment. Continue regular monitoring.',
    })
  }

  return `
    <div class="dashboard-page">
      <section class="dashboard-stats-grid">
        <article class="card dashboard-stat stat-blue">
          <div class="dashboard-stat-icon">${DashboardIcons.fileText}</div>
          <div>
            <p class="dashboard-stat-label">Active Cases</p>
            <h3 class="dashboard-stat-value">${activeCases}</h3>
          </div>
        </article>

        <article class="card dashboard-stat stat-purple">
          <div class="dashboard-stat-icon">${DashboardIcons.calendar}</div>
          <div>
            <p class="dashboard-stat-label">Upcoming Hearings</p>
            <h3 class="dashboard-stat-value">${upcomingHearings}</h3>
          </div>
        </article>

        <article class="card dashboard-stat stat-orange">
          <div class="dashboard-stat-icon">${DashboardIcons.clock}</div>
          <div>
            <p class="dashboard-stat-label">Pending Review</p>
            <h3 class="dashboard-stat-value">${pendingReview}</h3>
          </div>
        </article>

        <article class="card dashboard-stat stat-green">
          <div class="dashboard-stat-icon">${DashboardIcons.trendingUp}</div>
          <div>
            <p class="dashboard-stat-label">Cases This Month</p>
            <h3 class="dashboard-stat-value">${casesThisMonth}</h3>
          </div>
        </article>
      </section>

      <section class="dashboard-content-grid">
        <article class="card dashboard-list-card">
          <div class="dashboard-card-head">
            <h3>Recent Cases</h3>
            <a class="dashboard-view-all" href="/cases">View All</a>
          </div>

          <ul class="dashboard-list">
            ${recentCases.map((item) => `
              <li>
                <div class="dashboard-list-main">
                  <a href="/case-detail?id=${item._id}">${item.caseNumber}</a>
                  <p>${item.title}</p>
                </div>
                <div class="dashboard-list-meta">
                  <span class="badge dashboard-status ${statusClass(item.status)}">${item.status}</span>
                  <small>${dateLabel(item.createdAt)}</small>
                </div>
              </li>
            `).join('') || '<li><p class="small">No recent cases found.</p></li>'}
          </ul>
        </article>

        <article class="card dashboard-list-card">
          <div class="dashboard-card-head">
            <h3>Upcoming Hearings</h3>
            <a class="dashboard-view-all" href="/hearings">View All</a>
          </div>

          <ul class="dashboard-list">
            ${todaysHearings.map((item) => `
              <li>
                <div class="dashboard-list-main">
                  <a href="/case-detail?id=${item.caseId?._id || item.caseId}">${item.caseId?.caseNumber || '-'}</a>
                  <p>${item.courtroom || 'Courtroom pending'}</p>
                </div>
                <span class="dashboard-time-pill">${timeLabel(item.time)}</span>
              </li>
            `).join('') || '<li><p class="small">No hearings scheduled for today.</p></li>'}
          </ul>
        </article>
      </section>

      <section class="card dashboard-alerts-card">
        <h3>Important Alerts</h3>
        <ul class="dashboard-alert-list">
          ${alerts.map((item) => `
            <li>
              <span class="dashboard-alert-icon">${item.icon}</span>
              <div>
                <b>${item.title}</b>
                <p>${item.description}</p>
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    </div>
  `
}

async function init() {
  renderApp('/dashboard', 'Dashboard', emptyMarkup('Loading dashboard data...'))
  try {
    const [{ items: cases }, { items: hearings }, { items: documents }] = await Promise.all([
      api.get('/cases'),
      api.get('/hearings'),
      api.get('/documents'),
    ])
    document.getElementById('page-content').innerHTML = markup(cases, hearings, documents)
  } catch (error) {
    document.getElementById('page-content').innerHTML = emptyMarkup(`Failed to load dashboard: ${error.message}`)
  }
}

init()
