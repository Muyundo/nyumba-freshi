import React from 'react'
import { useParams, Link } from 'react-router-dom'

// Simple demo profile using params
export default function WorkerProfile() {
  const { id } = useParams()

  return (
    <div>
      <h2>Worker Profile</h2>
      <p>Profile for worker ID: {id}</p>
      <p>Demo details — name, services, hourly rate, reviews</p>
      <Link to={`/booking/${id}`}>Book this worker</Link>
    </div>
  )
}
