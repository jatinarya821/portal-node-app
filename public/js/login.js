import {
  getPostLoginDestination,
  listDemoUsers,
  redirectIfAuthenticated,
  signIn,
} from '/public/js/auth-client.js'

if (!redirectIfAuthenticated('/dashboard')) {
  const form = document.getElementById('login-form')
  const emailInput = document.getElementById('login-email')
  const passwordInput = document.getElementById('login-password')
  const messageEl = document.getElementById('login-message')
  const errorEl = document.getElementById('login-error')
  const demoList = document.getElementById('demo-users-list')

  function renderDemoUsers() {
    if (!demoList) return

    demoList.innerHTML = listDemoUsers()
      .map((user) => `
        <article class="demo-user-item">
          <div>
            <h3>${user.fullName}</h3>
            <p>${user.role}</p>
            <small>${user.email}</small>
            <small>Password: ${user.password}</small>
          </div>
          <button type="button" data-email="${user.email}" data-password="${user.password}">Use</button>
        </article>
      `)
      .join('')

    demoList.addEventListener('click', (event) => {
      const target = event.target
      if (!(target instanceof HTMLElement) || target.tagName !== 'BUTTON') return

      emailInput.value = target.dataset.email || ''
      passwordInput.value = target.dataset.password || ''
      emailInput.focus()
    })
  }

  renderDemoUsers()

  if (form) {
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      messageEl.textContent = ''
      errorEl.textContent = ''

      try {
        signIn({
          email: emailInput.value,
          password: passwordInput.value,
        })

        messageEl.textContent = 'Login successful. Redirecting...'
        const destination = getPostLoginDestination('/dashboard')
        window.setTimeout(() => {
          window.location.replace(destination)
        }, 350)
      } catch (error) {
        errorEl.textContent = error.message || 'Login failed'
      }
    })
  }
}
