import React from 'react'

export default function Dashboard() {
  // Demo placeholder for user's bookings
  const bookings = [
    { id: 1, worker: 'Asha', date: '2026-03-05', status: 'PENDING' },
  ]

  return (
    <div>
      <h2>My Bookings</h2>
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
