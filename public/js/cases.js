import { api } from '/public/js/api.js'
import { byId, closeModal, openModal, renderApp, toast } from '/public/js/utils.js'

let cases = []
let nextHearingByCaseId = new Map()

const urlParams = new URLSearchParams(window.location.search)
const initialSearchQuery = (urlParams.get('search') || '').trim()

const filters = {
  search: initialSearchQuery,
  status: 'All',
  type: 'All',
  priority: 'All',
  page: 1,
  limit: 10,
}

let pagination = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
  hasPrevPage: false,
  hasNextPage: false,
}

let searchDebounceId = null

function formatDate(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateCompact(value) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`
}

function formatCaseReference(item) {
  const typePrefixMap = {
    Civil: 'CIV',
    Criminal: 'CRM',
    Tax: 'TAX',
    Family: 'FAM',
    Traffic: 'TRF',
  }

  const prefix = typePrefixMap[item.type] || 'CAS'
  const caseNumber = String(item.caseNumber || '')

  const yearFromCaseNumber = caseNumber.match(/(19|20)\d{2}/)?.[0]
  const year = yearFromCaseNumber || new Date(item.createdAt || Date.now()).getFullYear()

  const serial = caseNumber.match(/(\d+)(?!.*\d)/)?.[0] || '0'
  return `${prefix}/${year}/${serial.padStart(6, '0')}`
}

function statusBadgeText(status) {
  if (!status) return 'Active'
  if (status === 'Closed' || status === 'Adjourned') return status
  return 'Active'
}

function parseHearingDateTime(dateValue, timeValue) {
  if (!dateValue) return null

  const normalizedDate = String(dateValue).slice(0, 10)
  const rawTime = String(timeValue || '').trim()

  if (!rawTime) {
    const candidate = new Date(`${normalizedDate}T23:59:59`)
    return Number.isNaN(candidate.getTime()) ? null : candidate
  }

  let candidate = null
  if (/^\d{1,2}:\d{2}$/.test(rawTime)) {
    candidate = new Date(`${normalizedDate}T${rawTime}:00`)
  } else if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(rawTime)) {
    candidate = new Date(`${normalizedDate} ${rawTime.toUpperCase()}`)
  } else {
    candidate = new Date(`${normalizedDate}T${rawTime}`)
  }

  if (Number.isNaN(candidate.getTime())) {
    const fallback = new Date(normalizedDate)
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }

  return candidate
}

function slug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'default'
}

function getNextHearingsMap(items) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const nearestByCase = new Map()

  items.forEach((item) => {
    const caseId = String(item.caseId?._id || item.caseId || '')
    if (!caseId || !item.date) return

    const candidate = parseHearingDateTime(item.date, item.time)
    if (!candidate || candidate < today) return

    const current = nearestByCase.get(caseId)
    if (!current || candidate < current.when) {
      nearestByCase.set(caseId, { hearing: item, when: candidate })
    }
  })

  const nextByCase = new Map()
  nearestByCase.forEach((value, key) => {
    nextByCase.set(key, value.hearing)
  })

  return nextByCase
}

function nextHearingLabel(item) {
  if (!item || !item.date) return 'Not Scheduled'
  return formatDateCompact(item.date)
}

function redraw() {
  byId('case-list').innerHTML = listCards(cases)

  const total = pagination.total ?? cases.length
  byId('count').textContent = `Showing ${cases.length} of ${total} cases`
  byId('page-indicator').textContent = `Page ${pagination.page} of ${pagination.totalPages}`
  byId('page-prev').disabled = !pagination.hasPrevPage
  byId('page-next').disabled = !pagination.hasNextPage
}

function updateFiltersFromInputs() {
  filters.search = byId('search').value.trim()
  filters.status = byId('status-filter').value
  filters.type = byId('type-filter').value
  filters.priority = byId('priority-filter').value
}

async function refreshCases({ resetPage = false } = {}) {
  updateFiltersFromInputs()
  if (resetPage) {
    filters.page = 1
  }

  await loadCases()
  redraw()
}

function mountModal() {
  byId('open-new-case').addEventListener('click', () => openModal('new-case-modal'))
  byId('close-new-case').addEventListener('click', () => closeModal('new-case-modal'))
  byId('create-case-btn').addEventListener('click', async () => {
    const payload = {
      title: byId('new-case-title').value.trim(),
      type: byId('new-case-type').value,
      priority: byId('new-case-priority').value,
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
      const response = await api.post('/cases', payload)
      const createdCase = response.item

      toast(`Case ${createdCase?.caseNumber || ''} filed successfully`)
      closeModal('new-case-modal')

      if (createdCase?._id) {
        window.location.href = `/case-detail?id=${encodeURIComponent(createdCase._id)}&tab=documents&openUpload=1`
        return
      }

      // Reset list filters so the newly filed case is visible immediately.
      filters.search = ''
      filters.status = 'All'
      filters.type = 'All'
      filters.priority = 'All'
      filters.page = 1

      byId('search').value = ''
      byId('status-filter').value = 'All'
      byId('type-filter').value = 'All'
      byId('priority-filter').value = 'All'

      await loadCases()
      redraw()
    } catch (error) {
      toast(`Failed: ${error.message}`)
    }
  })
}

function markup() {
  return `
    <div class="cases-page">
      <section class="card case-page-header">
        <div>
          <h2>Case Management</h2>
          <p class="small">View and manage all cases</p>
        </div>
        <button id="open-new-case" type="button">File New Case</button>
      </section>

      <section class="card case-filter-card">
        <div class="case-filters-grid">
          <input id="search" type="search" placeholder="Search cases" />
          <select id="status-filter">
            <option>All</option>
            <option>Filed</option>
            <option>Under Review</option>
            <option>Hearing Scheduled</option>
            <option>Adjourned</option>
            <option>Closed</option>
          </select>
          <select id="type-filter">
            <option>All</option>
            <option>Civil</option>
            <option>Criminal</option>
            <option>Tax</option>
          </select>
          <select id="priority-filter">
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Urgent</option>
          </select>
        </div>
      </section>

      <section class="case-results-summary">
        <p id="count" class="small">Showing 0 of 0 cases</p>
      </section>

      <section id="case-list" class="case-list-grid"></section>

      <section class="card case-pagination-card">
        <div class="row pagination-row">
          <button id="page-prev" class="secondary" type="button">Previous</button>
          <span id="page-indicator" class="small">Page 1 of 1</span>
          <button id="page-next" class="secondary" type="button">Next</button>
        </div>
      </section>
    </div>

    <div id="new-case-modal" class="modal">
      <div class="modal-box">
        <h3>File New Case</h3>
        <div class="field"><label>Case Title</label><input id="new-case-title" placeholder="Enter title" /></div>
        <div class="field"><label>Case Type</label><select id="new-case-type"><option>Civil</option><option>Criminal</option><option>Tax</option></select></div>
        <div class="field"><label>Priority</label><select id="new-case-priority"><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select></div>
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

function listCards(items) {
  if (!items.length) {
    return `
      <article class="card case-item case-item-empty">
        <p class="small">No cases found</p>
      </article>
    `
  }

  return items
    .map((item) => {
      const caseId = String(item._id || '')
      const detailsLink = caseId ? `/case-detail?id=${caseId}` : '/cases'
      const statusText = statusBadgeText(item.status)
      const priorityText = `${item.priority || 'Medium'} Priority`
      const typeText = item.type || 'General'
      const titleText = item.title || `${item.petitioner || 'Plaintiff'} vs. ${item.respondent || 'Defendant'}`

      return `
        <article class="card case-item">
          <div class="case-item-head">
            <h3 class="case-number">${formatCaseReference(item)}</h3>
            <div class="case-badges">
              <span class="badge case-badge case-status-${slug(statusText)}">${statusText}</span>
              <span class="badge case-badge case-priority-${slug(item.priority || 'medium')}">${priorityText}</span>
              <span class="badge case-badge case-type-${slug(typeText)}">${typeText}</span>
            </div>
          </div>

          <div>
            <h4 class="case-title">${titleText}</h4>
            <p class="case-description">${item.summary || 'No description available for this case.'}</p>
          </div>

          <div class="case-detail-grid">
            <div class="case-detail-cell"><span>Plaintiff</span><b>${item.petitioner || '-'}</b></div>
            <div class="case-detail-cell"><span>Defendant</span><b>${item.respondent || '-'}</b></div>
            <div class="case-detail-cell"><span>Judge</span><b>${item.judge || '-'}</b></div>
            <div class="case-detail-cell"><span>Filing Date</span><b>${formatDateCompact(item.createdAt)}</b></div>
          </div>

          <div class="case-item-footer">
            <p class="case-next-hearing">Next Hearing: <b>${nextHearingLabel(nextHearingByCaseId.get(caseId))}</b></p>
            <a class="case-view-btn" href="${detailsLink}">View Details</a>
          </div>
        </article>
      `
    })
    .join('')
}

async function loadCases() {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.status && filters.status !== 'All') params.set('status', filters.status)
  if (filters.type && filters.type !== 'All') params.set('type', filters.type)
  if (filters.priority && filters.priority !== 'All') params.set('priority', filters.priority)
  params.set('page', String(filters.page))
  params.set('limit', String(filters.limit))

  const [caseRes, hearingRes] = await Promise.all([
    api.get(`/cases?${params.toString()}`),
    api.get('/hearings'),
  ])

  cases = caseRes.items || []
  nextHearingByCaseId = getNextHearingsMap(hearingRes.items || [])

  pagination = {
    page: caseRes.pagination?.page || filters.page,
    limit: caseRes.pagination?.limit || filters.limit,
    total: caseRes.pagination?.total ?? cases.length,
    totalPages: caseRes.pagination?.totalPages || 1,
    hasPrevPage: Boolean(caseRes.pagination?.hasPrevPage),
    hasNextPage: Boolean(caseRes.pagination?.hasNextPage),
  }

  filters.page = pagination.page
}

async function init() {
  renderApp('/cases', 'Case Management', markup())

  byId('search').value = filters.search

  byId('search').addEventListener('input', () => {
    if (searchDebounceId) {
      window.clearTimeout(searchDebounceId)
    }

    searchDebounceId = window.setTimeout(() => {
      refreshCases({ resetPage: true }).catch((error) => {
        toast(`Failed to load cases: ${error.message}`)
      })
    }, 260)
  })

  byId('status-filter').addEventListener('change', () => {
    refreshCases({ resetPage: true }).catch((error) => {
      toast(`Failed to load cases: ${error.message}`)
    })
  })

  byId('type-filter').addEventListener('change', () => {
    refreshCases({ resetPage: true }).catch((error) => {
      toast(`Failed to load cases: ${error.message}`)
    })
  })

  byId('priority-filter').addEventListener('change', () => {
    refreshCases({ resetPage: true }).catch((error) => {
      toast(`Failed to load cases: ${error.message}`)
    })
  })

  byId('page-prev').addEventListener('click', () => {
    if (!pagination.hasPrevPage) return
    filters.page -= 1
    refreshCases().catch((error) => {
      toast(`Failed to load cases: ${error.message}`)
    })
  })

  byId('page-next').addEventListener('click', () => {
    if (!pagination.hasNextPage) return
    filters.page += 1
    refreshCases().catch((error) => {
      toast(`Failed to load cases: ${error.message}`)
    })
  })

  mountModal()

  try {
    await loadCases()
    redraw()
  } catch (error) {
    toast(`Failed to load cases: ${error.message}`)
  }
}

init()