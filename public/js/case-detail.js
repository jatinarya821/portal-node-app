import { api } from '/public/js/api.js'
import { byId, closeModal, openModal, renderApp, setupTabs, toast } from '/public/js/utils.js'

const params = new URLSearchParams(window.location.search)
const caseId = params.get('id')
let detail = null
let hearings = []
let documents = []

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

  return `
    <div class="card">
      <h3>${detail.caseNumber} - ${detail.title}</h3>
      <p><b>Type:</b> ${detail.type}</p>
      <p><b>Status:</b> <span class="badge">${detail.status}</span></p>
      <p><b>Judge:</b> ${detail.judge}</p>
      <p><b>Courtroom:</b> ${detail.court}</p>
      <p><b>Petitioner:</b> ${detail.petitioner}</p>
      <p><b>Respondent:</b> ${detail.respondent}</p>
      <p><b>Summary:</b> ${detail.summary}</p>
    </div>
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
  const [caseRes, hearingRes, docRes] = await Promise.all([
    api.get(`/cases/${caseId}`),
    api.get(`/hearings?caseId=${caseId}`),
    api.get(`/documents?caseId=${caseId}`),
  ])
  detail = caseRes.item
  hearings = hearingRes.items || []
  documents = docRes.items || []
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
