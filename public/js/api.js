async function parseResponse(response) {
  const raw = await response.text()
  const payload = (() => {
    if (!raw) return {}
    try {
      return JSON.parse(raw)
    } catch (error) {
      return {}
    }
  })()

  if (!response.ok) {
    const fallbackText = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ').slice(0, 220) : ''
    throw new Error(payload.message || fallbackText || `Request failed (${response.status})`)
  }
  return payload
}

export const api = {
  async get(path) {
    const res = await fetch(`/api${path}`, { credentials: 'include' })
    return parseResponse(res)
  },

  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse(res)
  },

  async patch(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse(res)
  },

  async delete(path) {
    const res = await fetch(`/api${path}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    return parseResponse(res)
  },

  async upload(path, formData) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    })
    return parseResponse(res)
  },
}

