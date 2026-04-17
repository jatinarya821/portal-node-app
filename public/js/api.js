async function parseResponse(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || 'Request failed')
  }
  return payload
}

export const api = {
  async get(path) {
    const res = await fetch(`/api${path}`)
    return parseResponse(res)
  },

  async post(path, body) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return parseResponse(res)
  },

  async upload(path, formData) {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      body: formData,
    })
    return parseResponse(res)
  },
}
