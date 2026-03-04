import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './WorkerDashboard.css'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const [jobRequests, setJobRequests] = useState([])
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
  const workerId = currentUser?.id

  useEffect(() => {
    const loadBookings = async () => {
      if (!workerId) return
      setLoading(true)
      setError('')
      try {
        const bookings = await api.getWorkerBookings(workerId)
        const pendingBookings = bookings.filter(b => b.status === 'pending') || []
        setJobRequests(
          pendingBookings.map(b => ({
            id: b.id,
            service: b.service,
            homeowner: b.homeownerName || 'Unknown Homeowner',
            homeownerPhone: b.homeownerPhone || '',
            date: new Date(b.bookingDate).toLocaleDateString(),
            notes: b.notes,
            status: 'Pending'
          }))
        )
      } catch (err) {
        console.error('Load bookings error', err)
        setError('Failed to load job requests')
      } finally {
        setLoading(false)
      }
    }

    loadBookings()
  }, [workerId])

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
      setJobRequests(prev => prev.filter(j => j.id !== bookingId))
      alert('Booking accepted!')
    } catch (err) {
      console.error('Accept booking error', err)
      alert('Failed to accept booking')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDeclineJob = async (bookingId) => {
    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'declined')
      setJobRequests(prev => prev.filter(j => j.id !== bookingId))
      alert('Booking declined')
    } catch (err) {
      console.error('Decline booking error', err)
      alert('Failed to decline booking')
    } finally {
      setProcessingId(null)
    }
  }

  const activeJobs = [
    {
      id: 1,
      service: 'Cleaning Service',
      homeowner: 'John D.',
      date: 'Today',
      time: '4:00 PM',
      status: 'In Progress',
      image: '👨‍💼'
    },
    {
      id: 2,
      service: 'Laundry & Ironing',
      homeowner: 'Emma W.',
      date: 'March 5',
      time: '10:00 AM',
      status: 'Scheduled',
      image: '👩‍💼'
    }
  ]

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
                        <p className={`job-status status-${job.status.toLowerCase().replace(' ', '-')}`}>
                          Status: {job.status}
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
              <p className="welcome-subtitle">Track all your active jobs</p>
            </div>

            <section className="active-jobs-section">
              <div className="jobs-list">
                {activeJobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-image">{job.image}</div>
                    <div className="job-info">
                      <h3 className="job-service">
                        {job.service} <span className="job-homeowner">for {job.homeowner}</span>
                      </h3>
                      <p className="job-datetime">{job.date}, {job.time}</p>
                      <p className={`job-status status-${job.status.toLowerCase().replace(' ', '-')}`}>
                        Status: {job.status}
                      </p>
                    </div>
                    <div className="job-actions">
                      <button className="btn-complete">Complete</button>
                      <button className="btn-reschedule">Reschedule</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
