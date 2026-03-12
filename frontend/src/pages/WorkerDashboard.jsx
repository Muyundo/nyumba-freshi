import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './WorkerDashboard.css'

function formatTime24to12(time24) {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function ChangePasswordModal({ isOpen, onClose }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resetForm = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  const handleClose = () => {
    if (isSubmitting) return
    resetForm()
    onClose()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }

    setIsSubmitting(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      setSuccess('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message = String(err?.message || '')
      if (message.includes('Current password is incorrect')) {
        setError('Current password is incorrect')
      } else {
        setError('Failed to change password. Please try again.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="worker-modal-overlay" onClick={handleClose}>
      <div className="worker-modal" onClick={(event) => event.stopPropagation()}>
        <div className="worker-modal-header">
          <h3>Change Password</h3>
          <button className="worker-modal-close" onClick={handleClose} type="button">✕</button>
        </div>
        <form className="worker-password-form" onSubmit={handleSubmit}>
          {error && <div className="worker-form-error">{error}</div>}
          {success && <div className="worker-form-success">{success}</div>}

          <label htmlFor="worker-old-password">Current Password</label>
          <input
            id="worker-old-password"
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            disabled={isSubmitting}
          />

          <label htmlFor="worker-new-password">New Password</label>
          <input
            id="worker-new-password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            disabled={isSubmitting}
          />

          <label htmlFor="worker-confirm-password">Confirm New Password</label>
          <input
            id="worker-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={isSubmitting}
          />

          <div className="worker-password-actions">
            <button className="worker-btn-secondary" type="button" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button className="worker-btn-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [processingId, setProcessingId] = useState(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

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
    time: booking.bookingTime ? formatTime24to12(booking.bookingTime) : '',
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
  const inProgressJobs = bookings.filter((booking) => booking.status === 'in-progress')
  const allActiveJobs = [...acceptedJobs, ...inProgressJobs]
  const declinedJobs = bookings.filter((booking) => booking.status === 'declined')
  const completedJobs = bookings.filter((booking) => booking.status === 'completed' || booking.status === 'cancelled')

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

  const handleStartJob = async (bookingId) => {
    // Check if worker is already working on another job
    if (inProgressJobs.length > 0) {
      alert('You are currently working on another job. Please complete that job first before starting a new one.')
      return
    }

    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'in-progress')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'in-progress' } : booking
      )))
    } catch (err) {
      console.error('Start job error', err)
      alert(err?.message || 'Failed to start job')
    } finally {
      setProcessingId(null)
    }
  }

  const handleFinishJob = async (bookingId) => {
    setProcessingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'completed')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'completed' } : booking
      )))
    } catch (err) {
      console.error('Finish job error', err)
      alert(err?.message || 'Failed to finish job')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="worker-dashboard-container">
      {/* Header */}
      <header className="worker-dashboard-header">
        <div className="header-left">
          <div className="logo">🏠 WorkerHub</div>
          <nav className="nav-tabs">
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
            <button 
              className={`nav-tab ${activeTab === 'declined' ? 'active' : ''}`}
              onClick={() => setActiveTab('declined')}
            >
              Declined ({declinedJobs.length})
            </button>
          </nav>
        </div>
        <div className="header-right">
          <div className="user-profile">
            <span className="avatar">👤</span>
            <span className="user-name">{displayName}</span>
          </div>
          <button className="btn-change-password" onClick={() => setShowPasswordModal(true)}>
            Change Password
          </button>
          <button className="btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="worker-dashboard-main">
        {/* Welcome Section */}
        <div className="welcome-section">
          <h1 className="welcome-title">Welcome back, {displayName}!</h1>
          <p className="welcome-subtitle">What is on your agenda today?</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-section">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <span className="stat-value">{jobRequests.length}</span>
              <span className="stat-label">Pending Requests</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💼</div>
            <div className="stat-content">
              <span className="stat-value">{acceptedJobs.length}</span>
              <span className="stat-label">Ready to Start</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">�</div>
            <div className="stat-content">
              <span className="stat-value">{inProgressJobs.length}</span>
              <span className="stat-label">Currently Working</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">❌</div>
            <div className="stat-content">
              <span className="stat-value">{declinedJobs.length}</span>
              <span className="stat-label">Declined</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <span className="stat-value">{completedJobs.length}</span>
              <span className="stat-label">Completed</span>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="action-cards-section">
          <div className="action-card" onClick={() => setActiveTab('requests')}>
            <div className="action-card-header">
              <div className="action-icon">📅</div>
              <h3>New Job Requests</h3>
            </div>
            <p className="action-description">View & accept appointments</p>
            <div className="action-card-footer">
              <span className="pending-count">{jobRequests.length} pending</span>
              <button className="btn-primary">View Requests</button>
            </div>
          </div>

          <div className="action-card" onClick={() => setActiveTab('jobs')}>
            <div className="action-card-header">
              <div className="action-icon">💼</div>
              <h3>Your Jobs</h3>
            </div>
            <p className="action-description">Manage your active jobs</p>
            <div className="action-card-footer">
              <span className="active-count">{allActiveJobs.length} active</span>
              <button className="btn-primary">View Jobs</button>
            </div>
          </div>

          <div className="action-card" onClick={() => setActiveTab('declined')}>
            <div className="action-card-header">
              <div className="action-icon">❌</div>
              <h3>Declined Jobs</h3>
            </div>
            <p className="action-description">Track jobs you've declined</p>
            <div className="action-card-footer">
              <span className="declined-count">{declinedJobs.length} declined</span>
              <button className="btn-primary">View Declined</button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        {activeTab === 'requests' ? (
          <section className="jobs-section">
            <h2 className="section-title">Job Requests</h2>
            {error && <div className="error-message">{error}</div>}
            {loading ? (
              <div className="loading-message">Loading job requests...</div>
            ) : jobRequests.length > 0 ? (
              <div className="jobs-list">
                {jobRequests.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-header">
                      <div className="job-avatar">👤</div>
                      <div className="job-title-info">
                        <h3 className="job-service">{job.service}</h3>
                        <p className="job-homeowner">{job.homeowner}</p>
                      </div>
                    </div>
                    <div className="job-details">
                      <p><strong>📅 Date:</strong> {job.date}{job.time && ` at ${job.time}`}</p>
                      {job.homeownerPhone && <p><strong>📞 Phone:</strong> {job.homeownerPhone}</p>}
                      {job.notes && <p><strong>📝 Notes:</strong> {job.notes}</p>}
                    </div>
                    <div className="job-actions">
                      <button 
                        className="btn-accept" 
                        onClick={() => handleAcceptJob(job.id)}
                        disabled={processingId === job.id}
                      >
                        {processingId === job.id ? '...' : '✓ Accept'}
                      </button>
                      <button 
                        className="btn-decline" 
                        onClick={() => handleDeclineJob(job.id)}
                        disabled={processingId === job.id}
                      >
                        {processingId === job.id ? '...' : '✕ Decline'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No pending requests</h3>
                <p>You're all caught up. New requests will appear here.</p>
              </div>
            )}
          </section>
        ) : activeTab === 'jobs' ? (
          <section className="jobs-section">
            <h2 className="section-title">Your Jobs</h2>
            {loading ? (
              <div className="loading-message">Loading bookings...</div>
            ) : allActiveJobs.length > 0 ? (
              <div className="jobs-list">
                {allActiveJobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-header">
                      <div className="job-avatar">👤</div>
                      <div className="job-title-info">
                        <h3 className="job-service">{job.service}</h3>
                        <p className="job-homeowner">{job.homeowner}</p>
                      </div>
                      <span className={`status-badge ${job.status === 'in-progress' ? 'status-working' : ''}`}>
                        {job.status === 'in-progress' ? '� Working' : '✓ Accepted'}
                      </span>
                    </div>
                    <div className="job-details">
                      <p><strong>📅 Date:</strong> {job.date}{job.time && ` at ${job.time}`}</p>
                      {job.homeownerPhone && <p><strong>📞 Phone:</strong> {job.homeownerPhone}</p>}
                      {job.notes && <p><strong>📝 Notes:</strong> {job.notes}</p>}
                      {job.status === 'accepted' && inProgressJobs.length > 0 && (
                        <p className="job-blocked-message">⏸️ You must finish your current job before starting this one</p>
                      )}
                    </div>
                    <div className="job-actions">
                      {job.status === 'accepted' && (
                        <button
                          className="btn-primary"
                          onClick={() => handleStartJob(job.id)}
                          disabled={processingId === job.id || inProgressJobs.length > 0}
                          title={inProgressJobs.length > 0 ? 'Finish your current job first' : ''}
                        >
                          {processingId === job.id ? '...' : '▶ Start Job'}
                        </button>
                      )}
                      {job.status === 'in-progress' && (
                        <button
                          className="btn-success"
                          onClick={() => handleFinishJob(job.id)}
                          disabled={processingId === job.id}
                        >
                          {processingId === job.id ? '...' : '✓ Finish Job'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">💼</div>
                <h3>No active jobs</h3>
                <p>Start by accepting job requests to see them here.</p>
              </div>
            )}
          </section>
        ) : (
          <section className="jobs-section">
            <h2 className="section-title">Declined Jobs</h2>
            {loading ? (
              <div className="loading-message">Loading declined jobs...</div>
            ) : declinedJobs.length > 0 ? (
              <div className="jobs-list">
                {declinedJobs.map((job) => (
                  <div key={job.id} className="job-card job-card-declined">
                    <div className="job-header">
                      <div className="job-avatar">👤</div>
                      <div className="job-title-info">
                        <h3 className="job-service">{job.service}</h3>
                        <p className="job-homeowner">{job.homeowner}</p>
                      </div>
                      <span className="status-badge status-declined">❌ Declined</span>
                    </div>
                    <div className="job-details">
                      <p><strong>📅 Date:</strong> {job.date}{job.time && ` at ${job.time}`}</p>
                      {job.homeownerPhone && <p><strong>📞 Phone:</strong> {job.homeownerPhone}</p>}
                      {job.notes && <p><strong>📝 Notes:</strong> {job.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✓</div>
                <h3>No declined jobs</h3>
                <p>You haven't declined any job requests yet.</p>
              </div>
            )}
          </section>
        )}
      </main>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
      />
    </div>
  )
}
