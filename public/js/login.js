import {
  redirectIfAuthenticated,
  signIn,
  getPostLoginDestination,
} from '/public/js/auth-client.js'

async function init() {
  // If already logged in, go straight to dashboard
  const redirected = await redirectIfAuthenticated()
  if (redirected) return

  const form = document.getElementById('login-form')
  const emailInput = document.getElementById('login-email')
  const passwordInput = document.getElementById('login-password')
  const submitBtn = document.getElementById('login-submit')
  const errorEl = document.getElementById('login-error')
  const successEl = document.getElementById('login-message')

  // Populate demo credential pills
  const demoList = document.getElementById('demo-users-list')
  const DEMOS = [
    { label: 'Admin', email: 'admin@court.local', password: 'Admin@1234', role: 'Chief Registrar' },
    { label: 'Judge', email: 'judge@court.local', password: 'Judge@1234', role: 'District Judge' },
    { label: 'Clerk', email: 'clerk@court.local', password: 'Clerk@1234', role: 'Registry Clerk' },
    { label: 'Advocate', email: 'lawyer@court.local', password: 'Lawyer@1234', role: 'Advocate' },
    { label: 'Citizen', email: 'citizen@court.local', password: 'Citizen@1234', role: 'Citizen' },
  ]

  if (demoList) {
    demoList.innerHTML = DEMOS.map((u) => `
      <button type="button" class="demo-pill" data-email="${u.email}" data-pw="${u.password}">
        <span class="demo-pill-label">${u.label}</span>
        <span class="demo-pill-role">${u.role}</span>
      </button>
    `).join('')

    demoList.addEventListener('click', (e) => {
      const pill = e.target.closest('.demo-pill')
      if (!pill) return
      emailInput.value = pill.dataset.email
      passwordInput.value = pill.dataset.pw
      errorEl.textContent = ''
    })
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorEl.textContent = ''
      successEl.textContent = ''
      submitBtn.disabled = true
      submitBtn.textContent = 'Signing in…'

      try {
        const user = await signIn({
          email: emailInput.value,
          password: passwordInput.value,
        })
        successEl.textContent = `Welcome, ${user.fullName}! Redirecting…`
        const dest = getPostLoginDestination(user)
        setTimeout(() => window.location.replace(dest), 400)
      } catch (err) {
        errorEl.textContent = err.message || 'Login failed'
        submitBtn.disabled = false
        submitBtn.textContent = 'Sign In'
      }
    })
  }
}

init()
