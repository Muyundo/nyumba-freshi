import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

export default function Booking() {
  const { workerId } = useParams()
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const navigate = useNavigate()

  const submit = (e) => {
    e.preventDefault()
    // In MVP we would POST to /api/bookings — here we just simulate
    alert(`Booking requested for worker ${workerId} on ${date}`)
    navigate('/dashboard')
  }

  return (
    <div>
      <h2>Book Worker {workerId}</h2>
      <form onSubmit={submit}>
        <div>
          <label>
            Date:
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </label>
        </div>
        <div>
          <label>
            Notes:
            <input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
        </div>
        <button type="submit">Request Booking</button>
      </form>
    </div>
  )
}
