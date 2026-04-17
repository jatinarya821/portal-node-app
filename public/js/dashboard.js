import { api } from '/public/js/api.js'
import { renderApp } from '/public/js/utils.js'

function emptyMarkup(message) {
  return `<div class="card full"><p>${message}</p></div>`
}

function markup(cases, hearings, documents) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = hearings.filter((h) => h.date >= today).length
  const latestCases = cases.slice(0, 6)
  const latestHearings = hearings.slice(0, 6)

  return `
    <div class="grid">
      <section class="card kpi"><h3>Total Cases</h3><h2>${cases.length}</h2><p class="small">Across active categories</p></section>
      <section class="card kpi"><h3>Upcoming Hearings</h3><h2>${upcoming}</h2><p class="small">Including rescheduled hearings</p></section>
      <section class="card kpi"><h3>Documents</h3><h2>${documents.length}</h2><p class="small">Orders, filings, and evidence</p></section>
      <section class="card kpi"><h3>Open Matters</h3><h2>${cases.filter((c) => c.status !== 'Closed').length}</h2><p class="small">Pending judicial action</p></section>

      <section class="card panel">
        <h3>Latest Cases</h3>
        <table class="table">
          <thead><tr><th>ID</th><th>Title</th><th>Status</th></tr></thead>
          <tbody>
            ${latestCases.map((c) => `<tr><td><a href="/case-detail?id=${c._id}">${c.caseNumber}</a></td><td>${c.title}</td><td><span class="badge">${c.status}</span></td></tr>`).join('') || '<tr><td colspan="3">No cases yet</td></tr>'}
          </tbody>
        </table>
      </section>

      <section class="card panel">
        <h3>Upcoming Hearings</h3>
        <table class="table">
          <thead><tr><th>Case</th><th>Date</th><th>Time</th><th>Courtroom</th></tr></thead>
          <tbody>
            ${latestHearings.map((h) => `<tr><td><a href="/case-detail?id=${h.caseId?._id || h.caseId}">${h.caseId?.caseNumber || '-'}</a></td><td>${h.date}</td><td>${h.time}</td><td>${h.courtroom}</td></tr>`).join('') || '<tr><td colspan="4">No hearings yet</td></tr>'}
          </tbody>
        </table>
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
