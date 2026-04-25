import { api } from '/public/js/api.js'
import { byId, closeModal, openModal, renderApp, toast } from '/public/js/utils.js'

let documents = []
let state = []
let allCases = []
let pendingCases = []

function getDownloadUrl(documentItem) {
  const url = String(documentItem?.fileUrl || '')
  if (url.startsWith('/api/documents/') && url.endsWith('/file')) return url
  if (url.startsWith('/uploads/')) return url
  return ''
}

function rows(items) {
  if (!items.length) {
    return `
      <tr>
        <td colspan="7">No documents uploaded yet. Filed cases are stored in Cases and appear here after a file is uploaded.</td>
      </tr>
    `
  }

  return items.map((d) => `
    <tr>
      <td>${d._id.slice(-6).toUpperCase()}</td>
      <td><a href="/case-detail?id=${d.caseId?._id || d.caseId}">${d.caseId?.caseNumber || '-'}</a></td>
      <td>${d.name}</td>
      <td>${d.category}</td>
      <td>${d.uploadedBy}</td>
      <td>${d.uploadedOn}</td>
      <td>${getDownloadUrl(d) ? `<a href="${getDownloadUrl(d)}" download>Download</a>` : '-'}</td>
    </tr>
  `).join('')
}

function pendingRows(items) {
  if (!items.length) {
    return `
      <tr>
        <td colspan="5">All registered cases already have at least one uploaded document.</td>
      </tr>
    `
  }

  return items.map((c) => `
    <tr>
      <td><a href="/case-detail?id=${c._id}&tab=documents&openUpload=1">${c.caseNumber || '-'}</a></td>
      <td>${c.title || '-'}</td>
      <td>${c.status || '-'}</td>
      <td>${c.createdAt ? new Date(c.createdAt).toISOString().slice(0, 10) : '-'}</td>
      <td><a href="/case-detail?id=${c._id}&tab=documents&openUpload=1">Upload</a></td>
    </tr>
  `).join('')
}

function recomputePendingCases() {
  const casesWithDocs = new Set(
    documents
      .map((d) => String(d.caseId?._id || d.caseId || ''))
      .filter(Boolean)
  )

  pendingCases = allCases
    .filter((c) => !casesWithDocs.has(String(c._id || '')))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

function redraw() {
  byId('doc-body').innerHTML = rows(state)
  byId('doc-count').textContent = `${state.length} results`
  byId('pending-case-body').innerHTML = pendingRows(pendingCases)
  byId('pending-case-count').textContent = `${pendingCases.length} case(s) pending upload`
}

function applyFilters() {
  const q = byId('doc-search').value.trim().toLowerCase()
  const type = byId('doc-filter').value
  state = documents.filter((d) => {
    const inText = `${d._id} ${d.caseId?.caseNumber || ''} ${d.name} ${d.category} ${d.uploadedBy}`.toLowerCase().includes(q)
    const inType = type === 'All' || d.category === type
    return inText && inType
  })
  redraw()
}

function mountUploadModal() {
  byId('open-upload').addEventListener('click', () => openModal('upload-modal'))
  byId('close-upload').addEventListener('click', () => closeModal('upload-modal'))
  byId('upload-btn').addEventListener('click', async () => {
    const selectedCaseId = byId('upload-case').value
    const fileInput = byId('upload-file')
    const file = fileInput.files[0]
    if (!selectedCaseId || !file) {
      toast('Case and file are required')
      return
    }

    const formData = new FormData()
    formData.append('caseId', selectedCaseId)
    formData.append('category', byId('upload-category').value)
    formData.append('uploadedBy', byId('upload-by').value.trim() || 'Registry User')
    formData.append('file', file)

    try {
      await api.upload('/documents', formData)
      toast('Document uploaded')
      closeModal('upload-modal')
      await loadDocuments()
      applyFilters()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
  })
}

function markup() {
  return `
    <div class="grid">
      <section class="card full row">
        <input id="doc-search" placeholder="Search by document, case, category" style="min-width:260px;flex:1" />
        <select id="doc-filter">
          <option>All</option>
          <option>Registration</option>
          <option>Filing</option>
          <option>Evidence</option>
          <option>Order</option>
        </select>
        <button id="open-upload">Upload Document</button>
        <span id="doc-count" class="small"></span>
      </section>

      <section class="card full">
        <table class="table">
          <thead><tr><th>ID</th><th>Case</th><th>Name</th><th>Category</th><th>Uploaded By</th><th>Date</th><th>Action</th></tr></thead>
          <tbody id="doc-body"></tbody>
        </table>
      </section>

      <section class="card full">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h3>Registered Cases Pending Document Upload</h3>
          <span id="pending-case-count" class="small"></span>
        </div>
        <table class="table">
          <thead><tr><th>Case No.</th><th>Title</th><th>Status</th><th>Filed On</th><th>Action</th></tr></thead>
          <tbody id="pending-case-body"></tbody>
        </table>
      </section>

      <section class="card full">
        <h3>Document Handling Notes</h3>
        <ul class="bullet-list">
          <li>Upload final files with clear names to improve retrieval during hearings.</li>
          <li>Use the correct category to keep filing, evidence, and orders separated.</li>
          <li>Ensure each upload is mapped to the exact case before submission.</li>
        </ul>
      </section>
    </div>

    <div id="upload-modal" class="modal">
      <div class="modal-box">
        <h3>Upload Document</h3>
        <div class="field"><label>Case</label><select id="upload-case"></select></div>
        <div class="field"><label>Category</label><select id="upload-category"><option>Filing</option><option>Evidence</option><option>Order</option></select></div>
        <div class="field"><label>Uploaded By</label><input id="upload-by" placeholder="Registry User" /></div>
        <div class="field"><label>Choose File</label><input id="upload-file" type="file" /></div>
        <div class="row">
          <button id="upload-btn">Upload</button>
          <button id="close-upload" class="secondary">Cancel</button>
        </div>
      </div>
    </div>
  `
}

async function loadDocuments() {
  const res = await api.get('/documents')
  documents = res.items || []
  state = [...documents]
  recomputePendingCases()
}

async function loadCases() {
  const res = await api.get('/cases')
  allCases = res.items || []
  byId('upload-case').innerHTML = allCases
    .map((c) => `<option value="${c._id}">${c.caseNumber} - ${c.title}</option>`)
    .join('')
  recomputePendingCases()
}

async function init() {
  renderApp('/documents', 'Documents', markup())
  byId('doc-search').addEventListener('input', applyFilters)
  byId('doc-filter').addEventListener('change', applyFilters)
  mountUploadModal()
  try {
    await Promise.all([loadDocuments(), loadCases()])
    redraw()
  } catch (error) {
    toast(`Failed to load documents: ${error.message}`)
  }
}

init()
