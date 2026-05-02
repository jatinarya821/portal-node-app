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

      const fullName = document.getElementById('reg-name').value.trim()
      const email = document.getElementById('reg-email').value.trim()
      const password = document.getElementById('reg-password').value

      // ── Name validation: only letters and spaces ──
      if (!/^[A-Za-z\s.]+$/.test(fullName)) {
        alert('Full name must contain only letters and spaces. Numbers and special characters are not allowed.')
        errorEl.textContent = 'Please enter a valid name (letters and spaces only).'
        submitBtn.disabled = false
        submitBtn.textContent = 'Create Account'
        return
      }

      if (fullName.length < 2) {
        alert('Name must be at least 2 characters long.')
        errorEl.textContent = 'Name is too short.'
        submitBtn.disabled = false
        submitBtn.textContent = 'Create Account'
        return
      }

      // ── Email validation: must be valid format ──
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
      if (!emailRegex.test(email)) {
        alert('Please enter a valid email address (e.g. yourname@example.com).')
        errorEl.textContent = 'Invalid email format.'
        submitBtn.disabled = false
        submitBtn.textContent = 'Create Account'
        return
      }

      // ── Password validation ──
      if (password.length < 8) {
        alert('Password must be at least 8 characters long.')
        errorEl.textContent = 'Password too short (minimum 8 characters).'
        submitBtn.disabled = false
        submitBtn.textContent = 'Create Account'
        return
      }

      try {
        const user = await register({
          fullName,
          email,
          password,
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
