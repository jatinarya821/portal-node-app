import {
  redirectIfAuthenticated,
  register,
  getPostLoginDestination,
} from '/public/js/auth-client.js'

async function init() {
  const redirected = await redirectIfAuthenticated()
  if (redirected) return

  const form = document.getElementById('register-form')
  const roleSelect = document.getElementById('reg-role')
  const barGroup = document.getElementById('bar-number-group')
  const submitBtn = document.getElementById('reg-submit')
  const errorEl = document.getElementById('reg-error')
  const successEl = document.getElementById('reg-message')

  // Show bar number field only for advocates
  if (roleSelect) {
    roleSelect.addEventListener('change', () => {
      barGroup.style.display = roleSelect.value === 'advocate' ? 'block' : 'none'
    })
  }

  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      errorEl.textContent = ''
      successEl.textContent = ''
      submitBtn.disabled = true
      submitBtn.textContent = 'Creating account…'

      try {
        const user = await register({
          fullName: document.getElementById('reg-name').value,
          email: document.getElementById('reg-email').value,
          password: document.getElementById('reg-password').value,
          role: roleSelect.value,
          barNumber: document.getElementById('reg-bar')?.value || '',
        })
        successEl.textContent = `Account created! Welcome, ${user.fullName}. Redirecting…`
        const dest = getPostLoginDestination(user)
        setTimeout(() => window.location.replace(dest), 600)
      } catch (err) {
        errorEl.textContent = err.message || 'Registration failed'
        submitBtn.disabled = false
        submitBtn.textContent = 'Create Account'
      }
    })
  }
}

init()
