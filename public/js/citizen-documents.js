import { api } from '/public/js/api.js'
import { renderApp, toast, openModal, closeModal } from '/public/js/utils.js'

function dateLabel(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function markup(cases, documents) {
  return `
    <div class="citizen-documents-page">

      <div class="citizen-cases-header">
        <div>
          <h2>My Documents</h2>
          <p class="small">${documents.length} document${documents.length !== 1 ? 's' : ''} across ${cases.length} case${cases.length !== 1 ? 's' : ''}</p>
        </div>
        ${cases.length > 0
          ? `<button id="upload-doc-btn" class="btn-citizen-primary">+ Upload Document</button>`
          : ''}
      </div>

      ${documents.length === 0
        ? `<div class="card citizen-empty-state">
            <div style="font-size:3rem;margin-bottom:0.5rem">📄</div>
            <h3>No Documents Yet</h3>
            <p class="small">Documents will appear here once you file a case or upload supporting documents.</p>
            <a href="/citizen/submit" class="btn-citizen-primary" style="margin-top:1rem">File a Case</a>
          </div>`
        : `<div class="citizen-documents-list">
            ${documents.map(d => `
              <div class="card citizen-doc-card">
                <div class="citizen-doc-top">
                  <div>
                    <span class="citizen-doc-name">${d.name}</span>
                    <span class="citizen-doc-category">${d.category || 'Filing'}</span>
                  </div>
                  ${d.fileUrl ? `<a href="${d.fileUrl}" target="_blank" class="btn-citizen-secondary small">Download</a>` : ''}
                </div>
                <div class="citizen-case-meta">
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Case</span>
                    <span>${d.caseId ? (d.caseId.caseNumber || d.caseNumber || '—') : '—'}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Type</span>
                    <span>${d.docType || '—'}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Uploaded By</span>
                    <span>${d.uploadedBy || '—'}</span>
                  </div>
                  <div class="citizen-case-meta-item">
                    <span class="citizen-meta-label">Date</span>
                    <span>${dateLabel(d.uploadedOn || d.createdAt)}</span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`
      }

      <!-- Upload Modal -->
      <div id="upload-modal" class="modal-backdrop">
        <div class="modal-box" style="max-width:480px">
          <h3 style="margin-bottom:0.8rem">Upload Document</h3>
          <form id="upload-form" enctype="multipart/form-data">
            <div class="field-group" style="margin-bottom:0.8rem">
              <label for="upload-case">Select Case <span class="field-required">*</span></label>
              <select id="upload-case" required>
                <option value="">Choose a case…</option>
                ${cases.map(c => `<option value="${c._id}">${c.caseNumber} — ${c.title}</option>`).join('')}
              </select>
            </div>
            <div class="field-group" style="margin-bottom:0.8rem">
              <label for="upload-category">Category</label>
              <select id="upload-category">
                <option value="Filing">Filing</option>
                <option value="Evidence">Evidence</option>
                <option value="Affidavit">Affidavit</option>
                <option value="Vakalatnama">Vakalatnama</option>
                <option value="Supporting Document">Supporting Document</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div class="field-group" style="margin-bottom:1rem">
              <label for="upload-file">File <span class="field-required">*</span></label>
              <input id="upload-file" type="file" required accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" />
              <span class="field-hint">PDF, DOC, DOCX, JPG, PNG — max 10 MB</span>
            </div>
            <p id="upload-error" class="login-error"></p>
            <div class="modal-actions">
              <button type="submit" id="upload-submit" class="btn-citizen-primary">Upload</button>
              <button type="button" id="upload-cancel" class="btn-citizen-secondary">Cancel</button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
}

async function init() {
  renderApp('/citizen/documents', 'Documents', '<p class="small" style="padding:1rem">Loading documents…</p>')

  try {
    // Fetch advocate's cases and their documents
    const { items: cases } = await api.get('/cases')
    const { items: documents } = await api.get('/documents')

    document.getElementById('page-content').innerHTML = markup(cases, documents)

    // Upload modal
    const uploadBtn = document.getElementById('upload-doc-btn')
    const cancelBtn = document.getElementById('upload-cancel')
    const uploadForm = document.getElementById('upload-form')
    const uploadError = document.getElementById('upload-error')
    const submitBtn = document.getElementById('upload-submit')

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => openModal('upload-modal'))
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => closeModal('upload-modal'))
    }

    if (uploadForm) {
      uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        uploadError.textContent = ''

        const caseId = document.getElementById('upload-case').value
        const category = document.getElementById('upload-category').value
        const fileInput = document.getElementById('upload-file')

        if (!caseId) {
          uploadError.textContent = 'Please select a case.'
          return
        }
        if (!fileInput.files.length) {
          uploadError.textContent = 'Please select a file.'
          return
        }

        const file = fileInput.files[0]
        if (file.size > 10 * 1024 * 1024) {
          uploadError.textContent = 'File too large. Maximum size is 10 MB.'
          return
        }

        submitBtn.disabled = true
        submitBtn.textContent = 'Uploading…'

        try {
          const formData = new FormData()
          formData.append('caseId', caseId)
          formData.append('category', category)
          formData.append('uploadedBy', 'Advocate')
          formData.append('file', file)

          const res = await fetch('/api/documents', {
            method: 'POST',
            body: formData,
            credentials: 'include',
          })

          if (!res.ok) {
            const data = await res.json()
            throw new Error(data.message || 'Upload failed')
          }

          toast('Document uploaded successfully!')
          closeModal('upload-modal')

          // Refresh the page
          const { items: newDocs } = await api.get('/documents')
          document.getElementById('page-content').innerHTML = markup(cases, newDocs)
        } catch (err) {
          uploadError.textContent = err.message || 'Upload failed'
        } finally {
          submitBtn.disabled = false
          submitBtn.textContent = 'Upload'
        }
      })
    }
  } catch (err) {
    document.getElementById('page-content').innerHTML =
      `<div class="card"><p class="small">Failed to load documents: ${err.message}</p></div>`
  }
}

init()
