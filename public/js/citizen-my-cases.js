import { api } from '/public/js/api.js'
import { renderApp, toast } from '/public/js/utils.js'

function statusClass(s) {
  return { 'Filed':'status-filed','Under Review':'status-under-review','Hearing Scheduled':'status-hearing-scheduled','Adjourned':'status-adjourned','Closed':'status-closed' }[s] || 'status-default'
}

function dateLabel(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })
}

function priorityBadge(p) {
  const colors = { Urgent:'#dc2626', High:'#ea580c', Medium:'#0369a1', Low:'#374151' }
  const c = colors[p] || '#374151'
  return `<span style="padding:0.12rem 0.45rem;border-radius:999px;font-size:0.72rem;font-weight:700;background:${c}18;color:${c};border:1px solid ${c}40">${p}</span>`
}

function markup(cases) {
  return `
    <div class="citizen-my-cases">

      <div class="citizen-cases-header">
        <div>
          <h2>My Cases</h2>
          <p class="small">${cases.length} case${cases.length !== 1 ? 's' : ''} found</p>
        </div>
        <a href="/citizen/submit" class="btn-citizen-primary">+ File New Case</a>
      </div>

      ${cases.length === 0
        ? `<div class="card citizen-empty-state">
            <div style="font-size:3rem;margin-bottom:0.5rem">📂</div>
            <h3>No Cases Filed Yet</h3>
            <p class="small">You haven't submitted any cases. File your first case to get started.</p>
            <a href="/citizen/submit" class="btn-citizen-primary" style="margin-top:1rem">File Your First Case</a>
          </div>`
        : `<div class="citizen-cases-list">
            ${cases.map(c => `
              <div class="card citizen-case-card">
                <div class="citizen-case-top">
                  <div>
                    <span class="citizen-case-number">${c.caseNumber}</span>
                    ${priorityBadge(c.priority)}
                  </div>
                  <span class="badge dashboard-status ${statusClass(c.status)}">${c.status}</span>
                </div>

                <h3 class="citizen-case-title">${c.title}</h3>
                <p class="small citizen-case-type">${c.type}</p>

                <div class="citizen-case-meta">
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Petitioner</span>
                    <span>${c.petitioner || '—'}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Respondent</span>
                    <span>${c.respondent || '—'}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Court</span>
                    <span>${c.court}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Judge</span>
                    <span>${c.judge}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Filed On</span>
                    <span>${dateLabel(c.createdAt)}</span>
                  </div>
                </div>

                ${c.summary ? `<p class="citizen-case-summary">${c.summary}</p>` : ''}
              </div>
            `).join('')}
          </div>`
      }
    </div>
  `
}

async function init() {
  renderApp('/citizen/my-cases', 'My Cases', '<p class="small" style="padding:1rem">Loading your cases…</p>')

  try {
    const { items } = await api.get('/cases')
    document.getElementById('page-content').innerHTML = markup(items)
  } catch (err) {
    document.getElementById('page-content').innerHTML =
      `<div class="card"><p class="small">Failed to load cases: ${err.message}</p></div>`
  }
}

init()
