import React from 'react'
import { useParams, Link } from 'react-router-dom'
import './WorkerProfile.css'

// Simple demo profile using params
export default function WorkerProfile() {
  const { id } = useParams()

  return (
    <div className="worker-profile-container">
      <div className="worker-profile-header">
        <h2>Worker Profile</h2>
        <p>Profile for worker ID: <strong>{id}</strong></p>
        <p>Demo details — name, services, hourly rate, reviews</p>
        <div className="worker-profile-actions">
          <Link to={`/booking/${id}`} className="btn-book">Book this worker</Link>
          <Link to="/workers" className="btn-back">Back to workers</Link>
        </div>
      </div>
    </div>
  )
}
