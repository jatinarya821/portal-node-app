import { api } from '/public/js/api.js'
import { renderApp, toast, openModal, closeModal } from '/public/js/utils.js'
import { fetchCurrentUser } from '/public/js/auth-client.js'

const ROLES = ['admin', 'judge', 'clerk', 'advocate', 'citizen']

const ROLE_COLORS = {
  admin:    { bg: '#f5f3ff', color: '#6d28d9', border: '#c4b5fd' },
  judge:    { bg: '#eff6ff', color: '#1d4ed8', border: '#93c5fd' },
  clerk:    { bg: '#f0fdf4', color: '#15803d', border: '#86efac' },
  advocate: { bg: '#fff7ed', color: '#c2410c', border: '#fdba74' },
  citizen:  { bg: '#f9fafb', color: '#374151', border: '#d1d5db' },
}

function roleBadge(role) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.citizen
  return `<span style="padding:0.18rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:700;background:${c.bg};color:${c.color};border:1px solid ${c.border}">${role.charAt(0).toUpperCase() + role.slice(1)}</span>`
}

function statusBadge(isActive) {
  return isActive
    ? `<span style="padding:0.18rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:700;background:#f0fdf4;color:#15803d;border:1px solid #86efac">Active</span>`
    : `<span style="padding:0.18rem 0.55rem;border-radius:999px;font-size:0.72rem;font-weight:700;background:#fef2f2;color:#b91c1c;border:1px solid #fca5a5">Inactive</span>`
}

function timeAgo(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

let allUsers = []
let editingUserId = null

function markup(users) {
  const totalByRole = ROLES.reduce((acc, r) => {
    acc[r] = users.filter(u => u.role === r).length
    return acc
  }, {})

  return `
    <div class="admin-users-page">

      <!-- Header -->
      <div class="admin-users-header">
        <div>
          <h2>User Management</h2>
          <p class="small">${users.length} total users registered</p>
        </div>
        <div class="admin-role-stats">
          ${ROLES.map(r => `
            <div class="admin-role-chip">
              ${roleBadge(r)}
              <span class="admin-role-count">${totalByRole[r]}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Search -->
      <div class="admin-search-bar card">
        <input id="user-search" type="text" placeholder="Search by name, email or role…" />
      </div>

      <!-- Table -->
      <div class="card admin-table-card">
        <table class="table admin-users-table" id="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last Login</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="users-tbody">
            ${renderRows(users)}
          </tbody>
        </table>
      </div>

    </div>

    <!-- Edit Modal -->
    <div id="edit-modal" class="modal-backdrop">
      <div class="modal-box">
        <h3 id="edit-modal-title">Edit User</h3>
        <form id="edit-form">
          <div class="field-group" style="margin-top:1rem">
            <label for="edit-fullname">Full Name</label>
            <input id="edit-fullname" type="text" />
          </div>
          <div class="field-group">
            <label for="edit-role">Role</label>
            <select id="edit-role">
              ${ROLES.map(r => `<option value="${r}">${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="field-group">
            <label for="edit-status">Account Status</label>
            <select id="edit-status">
              <option value="true">Active</option>
              <option value="false">Inactive (suspended)</option>
            </select>
          </div>
          <p id="edit-error" class="login-error"></p>
          <div class="modal-actions" style="justify-content:flex-start;margin-top:1rem">
            <button type="submit" class="btn-citizen-primary">Save Changes</button>
            <button type="button" id="edit-cancel" class="btn-citizen-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Delete Confirm Modal -->
    <div id="delete-modal" class="modal-backdrop">
      <div class="modal-box" style="text-align:center;max-width:360px">
        <div style="font-size:2.5rem;margin-bottom:0.5rem">⚠️</div>
        <h3>Delete User?</h3>
        <p class="small" id="delete-modal-name" style="margin:0.4rem 0 1rem">This user will be permanently removed.</p>
        <div class="modal-actions">
          <button id="confirm-delete-btn" class="btn-citizen-primary" style="background:linear-gradient(135deg,#dc2626,#991b1b)">Yes, Delete</button>
          <button id="cancel-delete-btn" class="btn-citizen-secondary">Cancel</button>
        </div>
      </div>
    </div>
  `
}

function renderRows(users) {
  if (users.length === 0) {
    return `<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">No users found</td></tr>`
  }
  return users.map(u => `
    <tr data-id="${u._id}">
      <td><strong>${u.fullName || '—'}</strong></td>
      <td>${u.email}</td>
      <td>${roleBadge(u.role)}</td>
      <td>${statusBadge(u.isActive !== false)}</td>
      <td>${timeAgo(u.lastLogin)}</td>
      <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-GB') : '—'}</td>
      <td>
        <div style="display:flex;gap:0.4rem">
          <button class="admin-action-btn edit-btn" data-id="${u._id}" title="Edit user">✏️ Edit</button>
          <button class="admin-action-btn delete-btn" data-id="${u._id}" title="Delete user" style="color:#b91c1c">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('')
}

function attachEvents() {
  // Search
  document.getElementById('user-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase()
    const filtered = allUsers.filter(u =>
      u.fullName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    )
    document.getElementById('users-tbody').innerHTML = renderRows(filtered)
    attachRowEvents()
  })

  attachRowEvents()

  // Edit form
  document.getElementById('edit-cancel')?.addEventListener('click', () => closeModal('edit-modal'))
  document.getElementById('edit-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const errorEl = document.getElementById('edit-error')
    errorEl.textContent = ''
    try {
      const { item } = await api.patch(`/users/${editingUserId}`, {
        fullName: document.getElementById('edit-fullname').value,
        role: document.getElementById('edit-role').value,
        isActive: document.getElementById('edit-status').value === 'true',
      })
      // Update local data
      const idx = allUsers.findIndex(u => u._id === editingUserId)
      if (idx !== -1) allUsers[idx] = item
      document.getElementById('users-tbody').innerHTML = renderRows(allUsers)
      attachRowEvents()
      closeModal('edit-modal')
      toast('User updated successfully')
    } catch (err) {
      errorEl.textContent = err.message
    }
  })

  // Delete confirm
  document.getElementById('cancel-delete-btn')?.addEventListener('click', () => closeModal('delete-modal'))
}

function attachRowEvents() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const user = allUsers.find(u => u._id === id)
      if (!user) return
      editingUserId = id
      document.getElementById('edit-modal-title').textContent = `Edit: ${user.fullName}`
      document.getElementById('edit-fullname').value = user.fullName || ''
      document.getElementById('edit-role').value = user.role
      document.getElementById('edit-status').value = String(user.isActive !== false)
      document.getElementById('edit-error').textContent = ''
      openModal('edit-modal')
    })
  })

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id
      const user = allUsers.find(u => u._id === id)
      if (!user) return
      document.getElementById('delete-modal-name').textContent =
        `"${user.fullName}" (${user.email}) will be permanently removed.`

      openModal('delete-modal')

      const confirmBtn = document.getElementById('confirm-delete-btn')
      const newBtn = confirmBtn.cloneNode(true)
      confirmBtn.replaceWith(newBtn)

      newBtn.addEventListener('click', async () => {
        try {
          await api.delete(`/users/${id}`)
          allUsers = allUsers.filter(u => u._id !== id)
          document.getElementById('users-tbody').innerHTML = renderRows(allUsers)
          attachRowEvents()
          closeModal('delete-modal')
          toast('User deleted')
        } catch (err) {
          toast(err.message, 'error')
          closeModal('delete-modal')
        }
      })
    })
  })
}

async function init() {
  renderApp('/admin/users', 'User Management', '<p class="small" style="padding:1rem">Loading users…</p>')

  const me = await fetchCurrentUser()
  if (!me || me.role !== 'admin') {
    window.location.replace('/dashboard')
    return
  }

  try {
    const { items } = await api.get('/users')
    allUsers = items
    document.getElementById('page-content').innerHTML = markup(items)
    attachEvents()
  } catch (err) {
    document.getElementById('page-content').innerHTML =
      `<div class="card"><p class="small">Failed to load users: ${err.message}</p></div>`
  }
}

init()
