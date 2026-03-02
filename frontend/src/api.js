const BASE = import.meta.env.VITE_API_BASE || ''

async function request(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export function getHello() {
  return request('/api/hello')
}

export function login(username) {
  return request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username }),
  })
}

export default { getHello, login }
