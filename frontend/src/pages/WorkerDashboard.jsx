import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './WorkerDashboard.css'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (error) {
    currentUser = null
  }
  const displayName = currentUser?.fullName || 'Worker'
  const workerId = currentUser?.userId || currentUser?.id

  const formatStatusLabel = (status) => {
    if (status === 'accepted') return 'Booking Accepted'
    if (status === 'declined') return 'Booking Declined'
    if (status === 'cancelled') return 'Booking Cancelled'
    return 'Booking Pending'
  }

  const mapBooking = (booking) => ({
    id: booking.id,
    service: booking.service,
    homeowner: booking.homeownerName || 'Unknown Homeowner',
    homeownerPhone: booking.homeownerPhone || '',
    date: booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A',
    notes: booking.notes,
    status: booking.status,
  })

  useEffect(() => {
    const loadBookings = async (showLoader = true) => {
      if (!workerId) {
        setError('Worker session not found. Please log in again.')
        setLoading(false)
        return
      }
      if (showLoader) {
        setLoading(true)
      }
      setError('')
      try {
        const workerBookings = await api.getWorkerBookings(workerId)
        setBookings((workerBookings || []).map(mapBooking))
      } catch (err) {
        console.error('Load bookings error', err)
        const message = String(err?.message || '')
        if (message.includes('401') || message.includes('403')) {
          setError('Session expired or unauthorized. Please log in again.')
          localStorage.removeItem('token')
          localStorage.removeItem('currentUser')
          localStorage.removeItem('userRole')
          navigate('/login')
        } else {
          setError('Failed to load job requests')
        }
      } finally {
        if (showLoader) {
          setLoading(false)
        }
      }
    }

    loadBookings()

    const refreshTimer = setInterval(() => {
      loadBookings(false)
    }, 15000)

    return () => clearInterval(refreshTimer)
  }, [workerId])

  const jobRequests = bookings.filter((booking) => booking.status === 'pending')
  const acceptedJobs = bookings.filter((booking) => booking.status === 'accepted')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  const handleAcceptJob = async (bookingId) => {
    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'accepted')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'accepted' } : booking
      )))
    } catch (err) {
      console.error('Accept booking error', err)
      alert(err?.message || 'Failed to accept booking')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeclineJob = async (bookingId) => {
    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'declined')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'declined' } : booking
      )))
    } catch (err) {
      console.error('Decline booking error', err)
      alert(err?.message || 'Failed to decline booking')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelJob = async (bookingId) => {
    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'cancelled')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
      )))
    } catch (err) {
      console.error('Cancel booking error', err)
      alert(err?.message || 'Failed to cancel booking')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="worker-dashboard-container">
      {/* Header with navigation */}
      <header className="worker-dashboard-header">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Job Requests
          </button>
          <button 
            className={`nav-tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            Your Jobs
          </button>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="worker-dashboard-main">
        {activeTab === 'requests' ? (
          <>
            {/* Welcome section */}
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome back, {displayName}!</h1>
              <p className="welcome-subtitle">What is on your agenda today?</p>
            </div>

            {/* Action cards */}
            <section className="actions-section">
              <div className="action-card new-requests">
                <div className="action-icon">📅</div>
                <h3>New Job Requests</h3>
                <p>View & accept appointments</p>
              </div>
              <div className="action-card active-jobs" onClick={() => setActiveTab('jobs')}>
                <div className="action-icon">✅</div>
                <h3>Your Jobs</h3>
                <p>Manage your active jobs</p>
              </div>
            </section>

            {/* Job Requests */}
            <section className="job-requests-section">
              <h2 className="section-title">📋 New Job Request{jobRequests.length !== 1 ? 's' : ''}</h2>
              {error && <div className="error-message">{error}</div>}
              {loading ? (
                <div className="loading-message">Loading job requests...</div>
              ) : jobRequests.length > 0 ? (
                <div className="jobs-list">
                  {jobRequests.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-image">👤</div>
                      <div className="job-info">
                        <h3 className="job-service">
                          {job.service} <span className="job-homeowner">from {job.homeowner}</span>
                        </h3>
                        <p className="job-datetime">{job.date}</p>
                        {job.notes && <p className="job-notes">{job.notes}</p>}
                        {job.homeownerPhone && <p className="job-phone">{job.homeownerPhone}</p>}
                        <p className={`job-status status-${job.status}`}>
                          Status: {formatStatusLabel(job.status)}
                        </p>
                      </div>
                      <div className="job-actions">
                        <button 
                          className="btn-accept" 
                          onClick={() => handleAcceptJob(job.id)}
                          disabled={processingId === job.id}
                        >
                          {processingId === job.id ? '...' : 'Accept'}
                        </button>
                        <button 
                          className="btn-decline" 
                          onClick={() => handleDeclineJob(job.id)}
                          disabled={processingId === job.id}
                        >
                          {processingId === job.id ? '...' : 'Decline'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No pending job requests at the moment.</div>
              )}
            </section>
          </>
        ) : (
          <>
            {/* Your Jobs tab */}
            <div className="welcome-section">
              <h1 className="welcome-title">Your Jobs</h1>
              <p className="welcome-subtitle">Track and manage your accepted bookings</p>
            </div>

            <section className="active-jobs-section">
              {loading ? (
                <div className="loading-message">Loading bookings...</div>
              ) : acceptedJobs.length > 0 ? (
                <div className="jobs-list">
                  {acceptedJobs.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-image">👤</div>
                      <div className="job-info">
                        <h3 className="job-service">
                          {job.service} <span className="job-homeowner">from {job.homeowner}</span>
                        </h3>
                        <p className="job-datetime">{job.date}</p>
                        {job.notes && <p className="job-notes">{job.notes}</p>}
                        {job.homeownerPhone && <p className="job-phone">{job.homeownerPhone}</p>}
                        <p className={`job-status status-${job.status}`}>
                          Status: {formatStatusLabel(job.status)}
                        </p>
                      </div>
                      <div className="job-actions">
                        <button
                          className="btn-cancel"
                          onClick={() => handleCancelJob(job.id)}
                          disabled={processingId === job.id}
                        >
                          {processingId === job.id ? '...' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">No accepted bookings yet.</div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
