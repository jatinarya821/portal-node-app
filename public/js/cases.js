import { api } from '/public/js/api.js'
import { byId, closeModal, openModal, renderApp, toast } from '/public/js/utils.js'

let cases = []
let state = []

function redraw() {
  byId('case-body').innerHTML = listRows(state)
  byId('count').textContent = `${state.length} results`
}

function applyFilters() {
  const q = byId('search').value.trim().toLowerCase()
  const type = byId('type-filter').value
  state = cases.filter((c) => {
    const matchText = `${c.caseNumber} ${c.title} ${c.status} ${c.judge}`.toLowerCase().includes(q)
    const matchType = type === 'All' || c.type === type
    return matchText && matchType
  })
  redraw()
}

function mountModal() {
  byId('open-new-case').addEventListener('click', () => openModal('new-case-modal'))
  byId('close-new-case').addEventListener('click', () => closeModal('new-case-modal'))
  byId('create-case-btn').addEventListener('click', async () => {
    const payload = {
      title: byId('new-case-title').value.trim(),
      type: byId('new-case-type').value,
      summary: byId('new-case-summary').value.trim(),
      petitioner: byId('new-case-petitioner').value.trim(),
      respondent: byId('new-case-respondent').value.trim(),
      court: byId('new-case-court').value.trim(),
      judge: byId('new-case-judge').value.trim(),
      status: byId('new-case-status').value,
    }

    if (!payload.title || !payload.type) {
      toast('Case title and type are required')
      return
    }

    try {
      await api.post('/cases', payload)
      toast('Case filed successfully')
      closeModal('new-case-modal')
      await loadCases()
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
        <input id="search" placeholder="Search by case id, title, status, judge" style="min-width:280px;flex:1" />
        <select id="type-filter">
          <option>All</option>
          <option>Civil</option>
          <option>Criminal</option>
          <option>Tax</option>
        </select>
        <button id="open-new-case">File New Case</button>
        <span id="count" class="small"></span>
      </section>

      <section class="card full">
        <table class="table">
          <thead><tr><th>Case ID</th><th>Title</th><th>Type</th><th>Status</th><th>Judge</th></tr></thead>
          <tbody id="case-body"></tbody>
        </table>
      </section>
    </div>

    <div id="new-case-modal" class="modal">
      <div class="modal-box">
        <h3>File New Case</h3>
        <div class="field"><label>Case Title</label><input id="new-case-title" placeholder="Enter title" /></div>
        <div class="field"><label>Case Type</label><select id="new-case-type"><option>Civil</option><option>Criminal</option><option>Tax</option></select></div>
        <div class="field"><label>Status</label><select id="new-case-status"><option>Filed</option><option>Under Review</option><option>Hearing Scheduled</option><option>Adjourned</option><option>Closed</option></select></div>
        <div class="field"><label>Judge</label><input id="new-case-judge" placeholder="Justice name" /></div>
        <div class="field"><label>Courtroom</label><input id="new-case-court" placeholder="Courtroom 1" /></div>
        <div class="field"><label>Petitioner</label><input id="new-case-petitioner" placeholder="Petitioner" /></div>
        <div class="field"><label>Respondent</label><input id="new-case-respondent" placeholder="Respondent" /></div>
        <div class="field"><label>Summary</label><textarea id="new-case-summary" rows="3"></textarea></div>
        <div class="row">
          <button id="create-case-btn">Submit</button>
          <button id="close-new-case" class="secondary">Cancel</button>
        </div>
      </div>
    </div>
  `
}

function listRows(items) {
  return items
    .map((c) => `
    <tr>
      <td><a href="/case-detail?id=${c._id}">${c.caseNumber}</a></td>
      <td>${c.title}</td>
      <td>${c.type}</td>
      <td><span class="badge">${c.status}</span></td>
      <td>${c.judge || '-'}</td>
    </tr>
  `)
    .join('')
}

async function loadCases() {
  const res = await api.get('/cases')
  cases = res.items || []
  state = [...cases]
}

async function init() {
  renderApp('/cases', 'Cases', markup())
  byId('search').addEventListener('input', applyFilters)
  byId('type-filter').addEventListener('change', applyFilters)
  mountModal()
  try {
    await loadCases()
    redraw()
  } catch (error) {
    toast(`Failed to load cases: ${error.message}`)
  }
}

init()
