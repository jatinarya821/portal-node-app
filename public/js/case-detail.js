import { api } from '/public/js/api.js'
import { byId, closeModal, openModal, renderApp, setupTabs, toast } from '/public/js/utils.js'
import { getCurrentUser } from '/public/js/auth-client.js'

const params = new URLSearchParams(window.location.search)
const caseId = params.get('id')
let detail = null
let hearings = []
let documents = []
let judges = []

function getDownloadUrl(documentItem) {
  const url = String(documentItem?.fileUrl || '')
  if (url.startsWith('/api/documents/') && url.endsWith('/file')) return url
  if (url.startsWith('/uploads/')) return url
  return ''
}

function infoPane() {
  if (!detail) {
    return '<div class="card"><p>Case not found.</p></div>'
  }

  const user = getCurrentUser()
  const role = user?.role || ''
  const isJudge = role === 'judge'
  const isStaff = role === 'clerk' || role === 'admin'

  // Judge actions: update status
  const judgeActions = isJudge ? `
    <div class="card" style="margin-top:0.8rem;border-left:3px solid #0369a1;padding:1rem">
      <h4 style="margin-bottom:0.6rem">Judge Actions</h4>
      <div class="row" style="gap:0.5rem;flex-wrap:wrap">
        <select id="judge-status-select" style="padding:0.4rem 0.8rem;border-radius:8px;border:1px solid var(--border)">
          <option value="">Change Status…</option>
          <option value="Under Review" ${detail.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Hearing Scheduled" ${detail.status === 'Hearing Scheduled' ? 'selected' : ''}>Hearing Scheduled</option>
          <option value="Adjourned" ${detail.status === 'Adjourned' ? 'selected' : ''}>Adjourned</option>
          <option value="Closed" ${detail.status === 'Closed' ? 'selected' : ''}>Closed</option>
        </select>
        <button id="judge-update-status-btn" style="padding:0.4rem 1rem;border-radius:8px">Update Status</button>
      </div>
    </div>
  ` : ''

  // Clerk/Admin: assign judge dropdown
  const assignJudge = isStaff ? `
    <div class="card" style="margin-top:0.8rem;border-left:3px solid #7c3aed;padding:1rem">
      <h4 style="margin-bottom:0.6rem">Assign Judge & Courtroom</h4>
      <div class="row" style="gap:0.5rem;flex-wrap:wrap;align-items:flex-end">
        <div class="field-group" style="flex:1;min-width:200px">
          <label for="assign-judge-select" style="font-size:0.8rem">Judge</label>
          <select id="assign-judge-select" style="padding:0.4rem 0.8rem;border-radius:8px;border:1px solid var(--border);width:100%">
            <option value="Not Assigned">Not Assigned</option>
            ${judges.map(j => `<option value="${j.fullName}" ${detail.judge === j.fullName ? 'selected' : ''}>${j.fullName} — ${j.designation || 'Judge'}</option>`).join('')}
          </select>
        </div>
        <div class="field-group" style="flex:1;min-width:150px">
          <label for="assign-court-select" style="font-size:0.8rem">Courtroom</label>
          <select id="assign-court-select" style="padding:0.4rem 0.8rem;border-radius:8px;border:1px solid var(--border);width:100%">
            <option value="Courtroom 1" ${detail.court === 'Courtroom 1' ? 'selected' : ''}>Courtroom 1</option>
            <option value="Courtroom 2" ${detail.court === 'Courtroom 2' ? 'selected' : ''}>Courtroom 2</option>
            <option value="Courtroom 3" ${detail.court === 'Courtroom 3' ? 'selected' : ''}>Courtroom 3</option>
            <option value="Courtroom 4" ${detail.court === 'Courtroom 4' ? 'selected' : ''}>Courtroom 4</option>
          </select>
        </div>
        <button id="assign-judge-btn" style="padding:0.4rem 1rem;border-radius:8px">Assign</button>
      </div>
    </div>
  ` : ''

  return `
    <div class="card">
      <h3>${detail.caseNumber} - ${detail.title}</h3>
      <p><b>Type:</b> ${detail.type}</p>
      <p><b>Status:</b> <span class="badge">${detail.status}</span></p>
      <p><b>Judge:</b> ${detail.judge}</p>
      <p><b>Courtroom:</b> ${detail.court}</p>
      <p><b>Petitioner:</b> ${detail.petitioner}</p>
      <p><b>Respondent:</b> ${detail.respondent}</p>
      ${detail.advocateName ? `<p><b>Advocate:</b> ${detail.advocateName}</p>` : ''}
      <p><b>Summary:</b> ${detail.summary}</p>
    </div>
    ${judgeActions}
    ${assignJudge}
  `
}

function hearingsPane() {
  const list = hearings
  return `
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h3>Hearings for ${detail.caseNumber}</h3>
        <button id="open-hearing-modal">Add Hearing</button>
      </div>
      <table class="table">
        <thead><tr><th>ID</th><th>Date</th><th>Time</th><th>Status</th><th>Courtroom</th></tr></thead>
        <tbody>
          ${list.map((h) => `<tr><td>${h._id.slice(-6).toUpperCase()}</td><td>${h.date}</td><td>${h.time}</td><td>${h.status}</td><td>${h.courtroom}</td></tr>`).join('') || '<tr><td colspan="5">No hearings yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

function documentsPane() {
  const list = documents
  return `
    <div class="card">
      <div class="row" style="justify-content:space-between">
        <h3>Documents for ${detail.caseNumber}</h3>
        <button id="open-doc-modal">Upload</button>
      </div>
      <table class="table">
        <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Uploaded By</th><th>Date</th><th>Action</th></tr></thead>
        <tbody>
          ${list.map((d) => {
    const downloadUrl = getDownloadUrl(d)
    const hasUploadedFile = Boolean(downloadUrl)
    const nameCell = hasUploadedFile
      ? `<a href="${downloadUrl}" target="_blank" rel="noreferrer">${d.name}</a>`
      : d.name
    const actionCell = hasUploadedFile
      ? `<a href="${downloadUrl}" download>Download</a>`
      : '-'

    return `<tr><td>${d._id.slice(-6).toUpperCase()}</td><td>${nameCell}</td><td>${d.category}</td><td>${d.uploadedBy}</td><td>${d.uploadedOn}</td><td>${actionCell}</td></tr>`
  }).join('') || '<tr><td colspan="6">No documents yet</td></tr>'}
        </tbody>
      </table>
    </div>
  `
}

function markup() {
  return `
    <div class="tabs">
      <button class="tab-btn active" data-tab="info">Case Info</button>
      <button class="tab-btn" data-tab="hearings">Hearings</button>
      <button class="tab-btn" data-tab="documents">Documents</button>
    </div>

    <section class="tab-pane active" data-tab="info">${infoPane()}</section>
    <section class="tab-pane" data-tab="hearings">${hearingsPane()}</section>
    <section class="tab-pane" data-tab="documents">${documentsPane()}</section>

    <div id="hearing-modal" class="modal">
      <div class="modal-box">
        <h3>Add Hearing</h3>
        <div class="field"><label>Date</label><input id="hearing-date" type="date" /></div>
        <div class="field"><label>Time</label><input id="hearing-time" type="time" /></div>
        <div class="field"><label>Status</label><select id="hearing-status"><option>Scheduled</option><option>Completed</option><option>Adjourned</option></select></div>
        <div class="field"><label>Courtroom</label><input id="hearing-courtroom" /></div>
        <div class="row">
          <button id="save-hearing-btn">Save</button>
          <button id="close-hearing-modal" class="secondary">Cancel</button>
        </div>
      </div>
    </div>

    <div id="doc-modal" class="modal">
      <div class="modal-box">
        <h3>Upload Document</h3>
        <div class="field"><label>Category</label><select id="doc-category"><option>Filing</option><option>Evidence</option><option>Order</option></select></div>
        <div class="field"><label>Uploaded By</label><input id="doc-by" placeholder="Registry User" /></div>
        <div class="field"><label>Choose File</label><input id="doc-file" type="file" /></div>
        <div class="row">
          <button id="save-doc-btn">Upload</button>
          <button id="close-doc-modal" class="secondary">Cancel</button>
        </div>
      </div>
    </div>
  `
}

async function loadDetail() {
  if (!caseId) return
  const user = getCurrentUser()
  const role = user?.role || ''
  const isStaff = role === 'clerk' || role === 'admin'

  const requests = [
    api.get(`/cases/${caseId}`),
    api.get(`/hearings?caseId=${caseId}`),
    api.get(`/documents?caseId=${caseId}`),
  ]

  // Fetch judges list for clerk/admin assign dropdown
  if (isStaff) {
    requests.push(api.get('/users?role=judge'))
  }

  const results = await Promise.all(requests)
  detail = results[0].item
  hearings = results[1].items || []
  documents = results[2].items || []
  if (isStaff && results[3]) {
    judges = results[3].items || []
  }
}

function bindInteractions() {
  setupTabs('.tab-btn', '.tab-pane')

  const initialTab = (params.get('tab') || '').trim().toLowerCase()
  if (initialTab) {
    const targetTab = initialTab === 'documents' || initialTab === 'hearings' || initialTab === 'info'
      ? initialTab
      : 'info'
    const tabBtn = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`)
    if (tabBtn) {
      tabBtn.click()
    }
  }

  if (params.get('openUpload') === '1') {
    const openDocButton = byId('open-doc-modal')
    if (openDocButton) {
      openDocButton.click()
      toast('Upload a filing document to see this case in Documents')
    }
  }

  document.addEventListener('click', async (event) => {
  const target = event.target
  if (!(target instanceof HTMLElement)) return

  // ── Judge: Update case status ──
  if (target.id === 'judge-update-status-btn') {
    const newStatus = byId('judge-status-select')?.value
    if (!newStatus) { toast('Select a status first'); return }
    try {
      await api.patch(`/cases/${caseId}`, { status: newStatus })
      toast(`Status updated to: ${newStatus}`)
      await init()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
    return
  }

  // ── Clerk/Admin: Assign judge + courtroom ──
  if (target.id === 'assign-judge-btn') {
    const judge = byId('assign-judge-select')?.value
    const court = byId('assign-court-select')?.value
    try {
      const updates = {}
      if (judge) updates.judge = judge
      if (court) updates.court = court
      // If assigning a judge, move from Filed to Under Review
      if (judge && judge !== 'Not Assigned' && detail.status === 'Filed') {
        updates.status = 'Under Review'
      }
      await api.patch(`/cases/${caseId}`, updates)
      toast(`Judge assigned: ${judge}`)
      await init()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
    return
  }

  if (target.id === 'open-hearing-modal') openModal('hearing-modal')
  if (target.id === 'close-hearing-modal') closeModal('hearing-modal')
  if (target.id === 'save-hearing-btn') {
    try {
      await api.post('/hearings', {
        caseId,
        date: byId('hearing-date').value,
        time: byId('hearing-time').value,
        status: byId('hearing-status').value,
        courtroom: byId('hearing-courtroom').value,
      })
      toast('Hearing added')
      closeModal('hearing-modal')
      await init()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
  }

  if (target.id === 'open-doc-modal') openModal('doc-modal')
  if (target.id === 'close-doc-modal') closeModal('doc-modal')
  if (target.id === 'save-doc-btn') {
    try {
      const file = byId('doc-file').files[0]
      if (!file) {
        toast('Select a file first')
        return
      }
      const formData = new FormData()
      formData.append('caseId', caseId)
      formData.append('category', byId('doc-category').value)
      formData.append('uploadedBy', byId('doc-by').value || 'Registry User')
      formData.append('file', file)
      await api.upload('/documents', formData)
      toast('Document uploaded')
      closeModal('doc-modal')
      await init()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
  }
  })
}

let isBound = false
async function init() {
  try {
    await loadDetail()
    renderApp('/cases', `Case Detail - ${detail.caseNumber}`, markup())
    if (!isBound) {
      bindInteractions()
      isBound = true
    }
  } catch (error) {
    renderApp('/cases', 'Case Detail', `<div class="card"><p>Failed to load case details: ${error.message}</p></div>`)
  }
}

init()
