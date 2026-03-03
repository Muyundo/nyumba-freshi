import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()
  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (error) {
    currentUser = null
  }
  const displayName = currentUser?.fullName || 'User'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  // Demo placeholder for user's bookings
  const bookings = [
    { id: 1, worker: 'Asha', date: '2026-03-05', status: 'PENDING' },
  ]

  return (
    <div>
      <h2>Welcome {displayName}</h2>
      <button type="button" className="btn-primary" onClick={handleLogout} style={{ marginBottom: 12 }}>
        Logout
      </button>
      <h3>My Bookings</h3>
      <ul>
        {bookings.map((b) => (
          <li key={b.id}>
            {b.worker} — {b.date} — <strong>{b.status}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}
