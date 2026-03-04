const BASE = import.meta.env.VITE_API_BASE || ''

let onTokenExpired = null

export function setTokenExpiredCallback(callback) {
  onTokenExpired = callback
}

function handleTokenExpired() {
  localStorage.removeItem('token')
  localStorage.removeItem('currentUser')
  localStorage.removeItem('userRole')
  if (onTokenExpired) {
    onTokenExpired()
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem('token')
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function request(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const res = await fetch(url, opts)
  
  // Handle token expiration (401 Unauthorized)
  if (res.status === 401) {
    handleTokenExpired()
    throw new Error('Session expired. Please log in again.')
  }
  
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${res.status} ${res.statusText}: ${text}`)
  }
  return res.json()
}

export function getHello() {
  return request('/api/hello')
}

export function login({ role, phone, password }) {
  return request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role, phone, password }),
  })
}

export function register(payload) {
  return request('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function getWorkers() {
  return request('/api/workers')
}

export function getWorker(id) {
  return request(`/api/workers/${id}`)
}

export function createBooking(payload) {
  return request('/api/bookings', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
}

export function getWorkerBookings(workerId) {
  return request(`/api/workers/${workerId}/bookings`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
}

export function getHomeownerBookings(homeownerId) {
  return request(`/api/homeowners/${homeownerId}/bookings`, {
    method: 'GET',
    headers: getAuthHeaders(),
  })
}

export function updateBookingStatus(bookingId, status) {
  return request(`/api/bookings/${bookingId}`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  })
}

export default {
  getHello,
  login,
  register,
  getWorkers,
  getWorker,
  createBooking,
  getWorkerBookings,
  getHomeownerBookings,
  updateBookingStatus,
}
