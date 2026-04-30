import { api } from '/public/js/api.js'
import { renderApp, toast, Icons } from '/public/js/utils.js'
import { fetchCurrentUser } from '/public/js/auth-client.js'

function statusClass(status) {
  const map = {
    'Filed': 'status-filed',
    'Under Review': 'status-under-review',
    'Hearing Scheduled': 'status-hearing-scheduled',
    'Adjourned': 'status-adjourned',
    'Closed': 'status-closed',
  }
  return map[status] || 'status-default'
}

function dateLabel(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function timeLabel(value) {
  if (!value) return 'TBA'
  const [h, m] = value.split(':').map(Number)
  const d = new Date(); d.setHours(h); d.setMinutes(m)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function markup(user, cases, hearings) {
  const today = new Date().toISOString().slice(0, 10)
  const activeCases = cases.filter(c => c.status !== 'Closed')
  const upcomingHearings = hearings.filter(h => h.date >= today).slice(0, 5)
  const pendingCases = cases.filter(c => c.status === 'Filed' || c.status === 'Under Review')

  const isAdvocate = user.role === 'advocate'
  const greeting = isAdvocate ? `Welcome, Advocate ${user.fullName}` : `Welcome, ${user.fullName}`

  return `
    <div class="citizen-dashboard">

      <!-- Welcome Banner -->
      <div class="citizen-welcome card">
        <div class="citizen-welcome-text">
          <h2>${greeting}</h2>
          <p class="small">${isAdvocate
            ? 'Manage your clients\' cases, track hearings, and file documents from your advocate portal.'
            : 'Track your case status, view upcoming hearings, and submit new case filings.'
          }</p>
        </div>
        <a href="/citizen/submit" class="btn-citizen-primary">
          ${Icons.submit} File New Case
        </a>
      </div>

      <!-- Stats Row -->
      <div class="citizen-stats-row">
        <div class="citizen-stat-card">
          <div class="citizen-stat-icon blue">${Icons.cases}</div>
          <div>
            <p class="citizen-stat-label">Total Cases</p>
            <h3 class="citizen-stat-value">${cases.length}</h3>
          </div>
        </div>
        <div class="citizen-stat-card">
          <div class="citizen-stat-icon orange">${Icons.hearings}</div>
          <div>
            <p class="citizen-stat-label">Upcoming Hearings</p>
            <h3 class="citizen-stat-value">${upcomingHearings.length}</h3>
          </div>
        </div>
        <div class="citizen-stat-card">
          <div class="citizen-stat-icon purple">${Icons.calendar}</div>
          <div>
            <p class="citizen-stat-label">Active Cases</p>
            <h3 class="citizen-stat-value">${activeCases.length}</h3>
          </div>
        </div>
        <div class="citizen-stat-card">
          <div class="citizen-stat-icon red">${Icons.bell}</div>
          <div>
            <p class="citizen-stat-label">Pending Review</p>
            <h3 class="citizen-stat-value">${pendingCases.length}</h3>
          </div>
        </div>
      </div>

      <!-- Content Grid -->
      <div class="citizen-content-grid">

        <!-- My Cases -->
        <div class="card citizen-list-card">
          <div class="dashboard-card-head">
            <h3>My Cases</h3>
            <a class="dashboard-view-all" href="/citizen/my-cases">View All</a>
          </div>
          ${cases.length === 0
            ? `<div class="citizen-empty">
                <p>You haven't filed any cases yet.</p>
                <a href="/citizen/submit" class="btn-citizen-primary small">File Your First Case</a>
              </div>`
            : `<ul class="dashboard-list">
                ${cases.slice(0, 5).map(c => `
                  <li>
                    <div class="dashboard-list-main">
                      <a href="/citizen/my-cases">${c.caseNumber}</a>
                      <p>${c.title}</p>
                    </div>
                    <div class="dashboard-list-meta">
                      <span class="badge dashboard-status ${statusClass(c.status)}">${c.status}</span>
                      <small>${dateLabel(c.createdAt)}</small>
                    </div>
                  </li>
                `).join('')}
              </ul>`
          }
        </div>

        <!-- Upcoming Hearings -->
        <div class="card citizen-list-card">
          <div class="dashboard-card-head">
            <h3>Upcoming Hearings</h3>
          </div>
          ${upcomingHearings.length === 0
            ? `<div class="citizen-empty"><p>No upcoming hearings scheduled.</p></div>`
            : `<ul class="dashboard-list">
                ${upcomingHearings.map(h => `
                  <li>
                    <div class="dashboard-list-main">
                      <b>${h.caseId?.caseNumber || '—'}</b>
                      <p>${h.courtroom || 'Courtroom TBD'}</p>
                      <small>${dateLabel(h.date)}</small>
                    </div>
                    <span class="dashboard-time-pill">${timeLabel(h.time)}</span>
                  </li>
                `).join('')}
              </ul>`
          }
        </div>

      </div>

      <!-- How It Works -->
      <div class="card citizen-howto">
        <h3>How It Works</h3>
        <div class="citizen-steps">
          <div class="citizen-step">
            <div class="citizen-step-num">1</div>
            <h4>File a Case</h4>
            <p>Submit your case with all required details. A case number is auto-generated.</p>
          </div>
          <div class="citizen-step">
            <div class="citizen-step-num">2</div>
            <h4>Registry Review</h4>
            <p>Court registry staff review your filing and assign a judge to your case.</p>
          </div>
          <div class="citizen-step">
            <div class="citizen-step-num">3</div>
            <h4>Hearing Scheduled</h4>
            <p>A hearing date and courtroom are assigned. You'll see it here immediately.</p>
          </div>
          <div class="citizen-step">
            <div class="citizen-step-num">4</div>
            <h4>Judgment Issued</h4>
            <p>After hearings, the judge issues an order. Track the outcome from your dashboard.</p>
          </div>
        </div>
      </div>

    </div>
  `
}

async function init() {
  renderApp('/citizen/dashboard', 'My Dashboard', '<p class="small" style="padding:1rem">Loading your dashboard…</p>')

  const user = await fetchCurrentUser()
  if (!user) return

  try {
    const [{ items: cases }, { items: hearings }] = await Promise.all([
      api.get('/cases'),
      api.get('/hearings'),
    ])

    // Filter hearings to only those related to user's cases
    const caseIds = new Set(cases.map(c => c._id))
    const myHearings = hearings.filter(h => caseIds.has(h.caseId?._id || h.caseId))

    document.getElementById('page-content').innerHTML = markup(user, cases, myHearings)
  } catch (err) {
    document.getElementById('page-content').innerHTML =
      `<div class="card"><p class="small">Failed to load dashboard: ${err.message}</p></div>`
  }
}

init()
