import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import './Booking.css'

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
    <div className="booking-container">
      <h2>Book Worker {workerId}</h2>
      <form className="booking-form" onSubmit={submit}>
        <div className="booking-form-group">
          <label htmlFor="date">Date</label>
          <input 
            id="date"
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            required 
          />
        </div>
        <div className="booking-form-group">
          <label htmlFor="notes">Notes</label>
          <textarea 
            id="notes"
            value={notes} 
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions or details for the worker..."
          />
        </div>
        <button className="booking-submit" type="submit">Request Booking</button>
      </form>
    </div>
  )
}
