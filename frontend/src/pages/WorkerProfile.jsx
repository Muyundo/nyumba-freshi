import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api'
import './WorkerProfile.css'

// Simple demo profile using params
export default function WorkerProfile() {
  const { id } = useParams()
  const [worker, setWorker] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        setLoading(true)
        setError(null)
        const workerData = await api.getWorker(id)
        setWorker(workerData)
      } catch (err) {
        console.error('Failed to fetch worker:', err)
        setError('Failed to load worker details. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchWorker()
    }
  }, [id])

  if (loading) {
    return (
      <div className="worker-profile-container">
        <p className="loading-message">Loading worker details...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="worker-profile-container">
        <p className="error-message">{error}</p>
        <Link to="/workers" className="btn-back">Back to workers</Link>
      </div>
    )
  }

  if (!worker) {
    return (
      <div className="worker-profile-container">
        <p className="error-message">Worker not found</p>
        <Link to="/workers" className="btn-back">Back to workers</Link>
      </div>
    )
  }

  return (
    <div className="worker-profile-container">
      <div className="worker-profile-header">
        <h2>{worker.fullName}</h2>
        <div className="worker-detail-row">
          <strong>Phone:</strong> {worker.phone}
        </div>
        {worker.location && (
          <div className="worker-detail-row">
            <strong>Location:</strong> {worker.location}
          </div>
        )}
        {worker.estate && (
          <div className="worker-detail-row">
            <strong>Estate:</strong> {worker.estate}
          </div>
        )}
        {worker.services && worker.services.length > 0 && (
          <div className="worker-detail-row">
            <strong>Services:</strong> {worker.services.join(', ')}
          </div>
        )}
        {worker.availability && (
          <div className="worker-detail-row">
            <strong>Availability:</strong> {worker.availability}
          </div>
        )}
        <div className="worker-profile-actions">
          <Link to={`/booking/${id}`} className="btn-book">Book this worker</Link>
          <Link to="/workers" className="btn-back">Back to workers</Link>
        </div>
      </div>
    </div>
  )
}
