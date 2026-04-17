export const Icons = {
  gavel: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3l7 7-3 3-7-7 3-3zM2 21l6-6"/><path d="M5 18l-2 2"/></svg>',
  folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H3z"/></svg>',
  calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>',
  search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
  moon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  sun: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
}

const THEME_KEY = 'portal-theme'

function pageDescription(path) {
  const map = {
    '/dashboard': 'Monitor judicial operations and identify urgent case actions quickly.',
    '/cases': 'Register matters, search records, and track each case lifecycle.',
    '/hearings': 'Plan upcoming sessions with calendar visibility and timeline clarity.',
    '/documents': 'Organize filings, evidence, and certified records per case.',
  }
  return map[path] || 'Unified case management workspace for courts and legal teams.'
}

export function shell(currentPath, pageTitle) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  return `
    <div class="shell">
      <header class="site-header">
        <div class="topbar">
          <div class="brand-wrap">
            <div class="brand">${Icons.gavel}<span>Judicial Case Management Portal</span></div>
            <p class="tagline">Court workflow, hearing intelligence, and document control in one place.</p>
          </div>

          <form id="global-search-form" class="global-search" role="search">
            <label class="sr-only" for="global-search-input">Search portal records</label>
            <input id="global-search-input" type="search" placeholder="Search case number, title, or judge" />
            <button type="submit" class="search-btn">${Icons.search} <span>Search</span></button>
          </form>

          <div class="header-tools">
            <button id="theme-toggle" class="icon-btn secondary" type="button" aria-label="Toggle light or dark mode">
              <span id="theme-icon">${Icons.moon}</span>
              <span id="theme-label">Dark</span>
            </button>

            <button id="profile-toggle" class="profile-btn" type="button" aria-haspopup="true" aria-expanded="false">
              <span class="avatar">JA</span>
              <span class="profile-copy">
                <b>Jatin Arya</b>
                <small>Court Administrator</small>
              </span>
            </button>
          </div>
        </div>

        <nav class="nav nav-below" aria-label="Primary navigation">
          <a href="/dashboard" class="${currentPath === '/dashboard' ? 'active' : ''}">Dashboard</a>
          <a href="/cases" class="${currentPath === '/cases' ? 'active' : ''}">Cases</a>
          <a href="/hearings" class="${currentPath === '/hearings' ? 'active' : ''}">Hearings</a>
          <a href="/documents" class="${currentPath === '/documents' ? 'active' : ''}">Documents</a>
        </nav>

        <div id="profile-panel" class="profile-panel" hidden>
          <p><b>User:</b> Jatin Arya</p>
          <p><b>Role:</b> Court Administrator</p>
          <p><b>Last Login:</b> ${today}</p>
        </div>
      </header>

      <main class="main">
        <section class="page-hero card">
          <div>
            <p class="eyebrow">Court e-Portal</p>
            <h1>${pageTitle}</h1>
            <p class="small">${pageDescription(currentPath)}</p>
          </div>
          <div class="hero-chips">
            <span class="chip">Realtime Records</span>
            <span class="chip">Secure Judicial Access</span>
            <span class="chip">${today}</span>
          </div>
        </section>
        <div id="page-content"></div>
      </main>
      <div id="toast" class="toast"></div>
    </div>
  `
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)

  const themeLabel = document.getElementById('theme-label')
  const themeIcon = document.getElementById('theme-icon')
  if (themeLabel) {
    themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark'
  }
  if (themeIcon) {
    themeIcon.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon
  }
}

function getPreferredTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function mountShellControls() {
  applyTheme(getPreferredTheme())

  const searchInput = document.getElementById('global-search-input')
  const searchForm = document.getElementById('global-search-form')
  const themeToggle = document.getElementById('theme-toggle')
  const profileToggle = document.getElementById('profile-toggle')
  const profilePanel = document.getElementById('profile-panel')

  const activeQuery = new URLSearchParams(window.location.search).get('search')
  if (searchInput && activeQuery) {
    searchInput.value = activeQuery
  }

  if (searchForm) {
    searchForm.addEventListener('submit', (event) => {
      event.preventDefault()
      const query = searchInput.value.trim()
      const target = query ? `/cases?search=${encodeURIComponent(query)}` : '/cases'
      window.location.href = target
    })
  }

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light'
      const next = current === 'dark' ? 'light' : 'dark'
      localStorage.setItem(THEME_KEY, next)
      applyTheme(next)
    })
  }

  if (profileToggle && profilePanel) {
    profileToggle.addEventListener('click', () => {
      const open = profilePanel.hidden
      profilePanel.hidden = !open
      profileToggle.setAttribute('aria-expanded', String(open))
    })

    if (window.__portalProfileListener) {
      document.removeEventListener('click', window.__portalProfileListener)
    }

    window.__portalProfileListener = (event) => {
      const clickedInside = profilePanel.contains(event.target) || profileToggle.contains(event.target)
      if (!clickedInside) {
        profilePanel.hidden = true
        profileToggle.setAttribute('aria-expanded', 'false')
      }
    }

    document.addEventListener('click', window.__portalProfileListener)
  }
}

export function renderApp(currentPath, title, pageMarkup) {
  document.body.innerHTML = shell(currentPath, title)
  const mount = document.getElementById('page-content')
  mount.innerHTML = pageMarkup
  mountShellControls()
}

export function toast(message) {
  const node = document.getElementById('toast')
  if (!node) return
  node.textContent = message
  node.classList.add('show')
  window.setTimeout(() => node.classList.remove('show'), 2000)
}

export function setupTabs(buttonSelector, paneSelector, onChange) {
  const buttons = Array.from(document.querySelectorAll(buttonSelector))
  const panes = Array.from(document.querySelectorAll(paneSelector))

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.tab
      buttons.forEach((b) => b.classList.toggle('active', b === button))
      panes.forEach((pane) => pane.classList.toggle('active', pane.dataset.tab === key))
      if (onChange) onChange(key)
    })
  })
}

export function openModal(id) {
  const modal = document.getElementById(id)
  if (modal) modal.classList.add('open')
}

export function closeModal(id) {
  const modal = document.getElementById(id)
  if (modal) modal.classList.remove('open')
}

export function byId(id) {
  return document.getElementById(id)
}
