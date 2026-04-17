export const Icons = {
  gavel: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3l7 7-3 3-7-7 3-3zM2 21l6-6"/><path d="M5 18l-2 2"/></svg>',
  folder: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H3z"/></svg>',
  calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>'
}

export function shell(currentPath, pageTitle) {
  return `
    <div class="shell">
      <header class="topbar">
        <div class="brand">${Icons.gavel}<span>Judicial Case Management Portal</span></div>
        <nav class="nav">
          <a href="/dashboard" class="${currentPath === '/dashboard' ? 'active' : ''}">Dashboard</a>
          <a href="/cases" class="${currentPath === '/cases' ? 'active' : ''}">Cases</a>
          <a href="/hearings" class="${currentPath === '/hearings' ? 'active' : ''}">Hearings</a>
          <a href="/documents" class="${currentPath === '/documents' ? 'active' : ''}">Documents</a>
        </nav>
      </header>
      <main class="main">
        <h1>${pageTitle}</h1>
        <p class="small">Digital workflows for transparent hearings and records.</p>
        <div id="page-content"></div>
      </main>
      <div id="toast" class="toast"></div>
    </div>
  `
}

export function renderApp(currentPath, title, pageMarkup) {
  document.body.innerHTML = shell(currentPath, title)
  const mount = document.getElementById('page-content')
  mount.innerHTML = pageMarkup
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
