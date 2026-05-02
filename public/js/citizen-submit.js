import { api } from '/public/js/api.js'
import { renderApp, toast, openModal, closeModal } from '/public/js/utils.js'

const CASE_TYPES = ['Civil', 'Criminal', 'Family', 'Labour', 'Revenue', 'Consumer', 'Motor Accident', 'Constitutional', 'Other']

function markup() {
  return `
    <div class="citizen-submit-page">

      <div class="card citizen-form-card">
        <div class="citizen-form-header">
          <h2>File a New Case</h2>
          <p class="small">Fill in all the required details below. A unique case number will be auto-generated after submission.</p>
        </div>

        <form id="case-form" class="citizen-case-form" novalidate>

          <div class="citizen-form-section">
            <h4 class="citizen-form-section-title">Case Information</h4>

            <div class="citizen-field-row">
              <div class="field-group">
                <label for="cf-title">Case Title <span class="field-required">*</span></label>
                <input id="cf-title" type="text" placeholder="e.g. Property dispute between parties" required />
              </div>
              <div class="field-group">
                <label for="cf-type">Case Type <span class="field-required">*</span></label>
                <select id="cf-type" required>
                  <option value="">Select type…</option>
                  ${CASE_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="citizen-field-row">
              <div class="field-group">
                <label for="cf-petitioner">Petitioner Name <span class="field-required">*</span></label>
                <input id="cf-petitioner" type="text" placeholder="Full name of the petitioner" required />
              </div>
              <div class="field-group">
                <label for="cf-respondent">Respondent Name</label>
                <input id="cf-respondent" type="text" placeholder="Full name of the respondent" />
              </div>
            </div>

            <div class="field-group">
              <label for="cf-summary">Case Summary</label>
              <textarea id="cf-summary" rows="4" placeholder="Briefly describe the matter — facts, relief sought, relevant background…"></textarea>
            </div>
          </div>

          <div class="citizen-form-section">
            <h4 class="citizen-form-section-title">Your Advocate (Optional)</h4>
            <div class="citizen-field-row">
              <div class="field-group">
                <label for="cf-advocate-email">Advocate's Registered Email</label>
                <input id="cf-advocate-email" type="email" placeholder="e.g. advocate@example.com" />
                <span class="field-hint">If you have a lawyer, enter their registered email to give them access to this case.</span>
                <p id="cf-advocate-status" class="small" style="margin-top:0.3rem"></p>
              </div>
              <div class="field-group">
                <p class="field-hint" style="margin-top:1.6rem">Leave blank if you are representing yourself (party-in-person).</p>
              </div>
            </div>
          </div>

          <div class="citizen-form-section">
            <h4 class="citizen-form-section-title">Filing Options</h4>
            <div class="citizen-field-row">
              <div class="field-group">
                <label for="cf-priority">Priority</label>
                <select id="cf-priority">
                  <option value="Low">Low</option>
                  <option value="Medium" selected>Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div class="field-group">
                <p class="field-hint" style="margin-top:1.6rem">Courtroom and judge will be assigned by the court registry after review.</p>
              </div>
            </div>
          </div>

          <div class="citizen-form-actions">
            <p id="cf-error" class="login-error"></p>
            <button id="cf-submit" type="submit" class="btn-citizen-primary large">Submit Case Filing</button>
          </div>

        </form>
      </div>

      <!-- Success Modal -->
      <div id="success-modal" class="modal-backdrop">
        <div class="modal-box citizen-success-modal">
          <div class="citizen-success-icon">✓</div>
          <h3>Case Filed Successfully!</h3>
          <p>Your case number is:</p>
          <div id="modal-case-number" class="citizen-case-number-badge">—</div>
          <p class="small">The court registry will review your filing and assign a judge shortly. You can track the status from your dashboard.</p>
          <div class="modal-actions">
            <a href="/citizen/my-cases" class="btn-citizen-primary">View My Cases</a>
            <button type="button" id="file-another-btn" class="btn-citizen-secondary">File Another</button>
          </div>
        </div>
      </div>

    </div>
  `
}

async function init() {
  renderApp('/citizen/submit', 'Submit Case', markup())

  const form = document.getElementById('case-form')
  const errorEl = document.getElementById('cf-error')
  const submitBtn = document.getElementById('cf-submit')

  document.getElementById('file-another-btn')?.addEventListener('click', () => {
    closeModal('success-modal')
    form.reset()
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    errorEl.textContent = ''

    const title = document.getElementById('cf-title').value.trim()
    const type = document.getElementById('cf-type').value

    if (!title) { errorEl.textContent = 'Case title is required.'; return }
    if (!type) { errorEl.textContent = 'Please select a case type.'; return }

    submitBtn.disabled = true
    submitBtn.textContent = 'Submitting…'

    try {
      const { item } = await api.post('/cases', {
        title,
        type,
        petitioner: document.getElementById('cf-petitioner').value.trim(),
        respondent: document.getElementById('cf-respondent').value.trim(),
        summary: document.getElementById('cf-summary').value.trim(),
        priority: document.getElementById('cf-priority').value,
        advocateEmail: document.getElementById('cf-advocate-email').value.trim(),
      })

      document.getElementById('modal-case-number').textContent = item.caseNumber
      openModal('success-modal')
    } catch (err) {
      errorEl.textContent = err.message || 'Submission failed. Please try again.'
    } finally {
      submitBtn.disabled = false
      submitBtn.textContent = 'Submit Case Filing'
    }
  })
}

init()
