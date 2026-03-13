import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Dashboard.css'

function formatTime24to12(time24) {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long')
      return
    }

    setLoading(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      setSuccess('Password changed successfully!')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err.message || 'Failed to change password. Please check your old password.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Password</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="change-password-form">
          {error && <div className="form-error">{error}</div>}
          {success && <div className="form-success">{success}</div>}

          <div className="form-group">
            <label htmlFor="oldPassword">Current Password</label>
            <input
              id="oldPassword"
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Enter your current password"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 6 characters)"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn-cancel"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('home')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelingBookingId, setCancelingBookingId] = useState(null)
  const [error, setError] = useState('')
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (parseError) {
    currentUser = null
  }

  const displayName = currentUser?.fullName || 'User'
  const firstName = displayName.split(' ')[0]
  const homeownerId = currentUser?.userId || currentUser?.id

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  const getServiceIcon = (service) => {
    const serviceLower = String(service || '').toLowerCase()
    if (serviceLower.includes('cleaning') && serviceLower.includes('laundry')) return '🧹🧺'
    if (serviceLower.includes('laundry')) return '🧺'
    if (serviceLower.includes('cleaning')) return '🧹'
    return '🏠'
  }

  useEffect(() => {
    const loadBookings = async (showLoader = true) => {
      if (!homeownerId) {
        setError('Homeowner session not found. Please log in again.')
        setLoading(false)
        return
      }

      if (showLoader) {
        setLoading(true)
      }
      setError('')

      try {
        const homeownerBookings = await api.getHomeownerBookings(homeownerId)
        setBookings(homeownerBookings || [])
      } catch (loadError) {
        console.error('Load homeowner bookings error', loadError)
        setError('Failed to load your bookings')
      } finally {
        if (showLoader) {
          setLoading(false)
        }
      }
    }

    loadBookings()
    const refreshTimer = setInterval(() => loadBookings(false), 15000)
    return () => clearInterval(refreshTimer)
  }, [homeownerId])

  const upcomingBookings = bookings.filter((booking) => {
    const normalizedStatus = String(booking.status || '').toLowerCase().trim()
    return ['pending', 'accepted'].includes(normalizedStatus)
  })

  const quickServices = bookings.slice(0, 3).map((booking) => ({
    service: booking.service,
    worker: booking.workerName,
    date: booking.bookingDate,
    time: booking.bookingTime,
    icon: getServiceIcon(booking.service),
  }))

  const getStatusBadge = (status) => {
    const normalizedStatus = String(status || '').toLowerCase().trim()
    if (normalizedStatus === 'accepted') {
      return <span className="status-badge accepted">✓ Accepted</span>
    }
    if (normalizedStatus === 'declined') {
      return <span className="status-badge declined">✕ Declined</span>
    }
    if (normalizedStatus === 'cancelled') {
      return <span className="status-badge cancelled">○ Cancelled</span>
    }
    return <span className="status-badge pending">⌛ Pending</span>
  }

  const cancelBooking = async (bookingId) => {
    const confirmed = window.confirm('Are you sure you want to cancel this pending booking?')
    if (!confirmed) return

    setError('')
    setCancelingBookingId(bookingId)
    try {
      await api.updateBookingStatus(bookingId, 'cancelled')
      setBookings((prev) => prev.map((booking) => (
        booking.id === bookingId ? { ...booking, status: 'cancelled' } : booking
      )))
    } catch (cancelError) {
      setError(cancelError?.message || 'Failed to cancel booking')
    } finally {
      setCancelingBookingId(null)
    }
  }

  return (
    <div className="homeowner-dashboard-container">
      <header className="homeowner-dashboard-header">
        <div className="header-left">
          <div className="logo">
            <span className="logo-icon">🏠</span>
            <span className="logo-text">HomeEase</span>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              Find Workers
            </button>
            <button
              className={`nav-tab ${activeTab === 'myBookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('myBookings')}
            >
              My Bookings
            </button>
          </nav>
        </div>
        <div className="header-right">
          <div className="user-profile" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="user-avatar">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{displayName}</span>
            <span className="dropdown-arrow">▼</span>
            {showProfileMenu && (
              <div className="profile-menu">
                <button onClick={() => {
                  setShowPasswordModal(true)
                  setShowProfileMenu(false)
                }} className="menu-item">
                  🔒 Change Password
                </button>
                <button onClick={handleLogout} className="menu-item logout-item">
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="homeowner-dashboard-main">
        {activeTab === 'home' ? (
          <>
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome {firstName}</h1>
              <p className="welcome-subtitle">Find trusted help for your home today.</p>
              <div className="welcome-actions">
                <button className="btn-primary" onClick={() => navigate('/workers')}>
                  <span className="btn-icon">👥</span>
                  Find Workers
                </button>
                <button className="btn-secondary" onClick={() => setActiveTab('myBookings')}>
                  <span className="btn-icon">📋</span>
                  View My Bookings
                </button>
              </div>
            </div>

            {quickServices.length > 0 && (
              <section className="quick-services-section">
                <h2 className="section-title">
                  <span className="section-icon">📋</span>
                  Quick Services
                </h2>
                <div className="quick-services-grid">
                  {quickServices.map((service, idx) => (
                    <div key={idx} className="quick-service-card">
                      <div className="service-icon-large">{service.icon}</div>
                      <div className="service-details">
                        <h3 className="service-name">{service.service}</h3>
                        {service.worker ? (
                          <p className="service-worker">with {service.worker}</p>
                        ) : (
                          <p className="service-date">{service.date ? new Date(service.date).toLocaleDateString() : ''}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="upcoming-bookings-section">
              <h2 className="section-title">
                <span className="section-icon">📅</span>
                Upcoming Bookings
              </h2>
              {loading ? (
                <div className="loading-message">Loading bookings...</div>
              ) : upcomingBookings.length > 0 ? (
                <div className="bookings-list">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="booking-item">
                      <div className="booking-avatar">
                        {(booking.workerName || 'W').charAt(0).toUpperCase()}
                        <span className="online-indicator"></span>
                      </div>
                      <div className="booking-content">
                        <h3 className="booking-title">
                          {booking.service} with {booking.workerName || 'Worker'}
                        </h3>
                        <p className="booking-date">
                          {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                          {booking.bookingTime && ` at ${formatTime24to12(booking.bookingTime)}`}
                        </p>
                      </div>
                      <div className="booking-actions">
                        {getStatusBadge(booking.status)}
                        {String(booking.status || '').toLowerCase().trim() === 'pending' && (
                          <button
                            className="btn-cancel-booking"
                            onClick={() => cancelBooking(booking.id)}
                            disabled={cancelingBookingId === booking.id}
                          >
                            {cancelingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                          </button>
                        )}
                        <button className="btn-view-details">View Details</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <div className="clipboard-icon">
                      <div className="clipboard-top"></div>
                      <div className="clipboard-body"></div>
                      <div className="magnifier">🔍</div>
                    </div>
                  </div>
                  <p className="empty-state-title">No upcoming bookings</p>
                  <p className="empty-state-subtitle">Find trusted workers near you.</p>
                  <button className="btn-find-workers" onClick={() => navigate('/workers')}>
                    Find Workers
                  </button>
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <div className="page-header">
              <h1 className="page-title">My Bookings</h1>
              <p className="page-subtitle">Track all your service bookings</p>
            </div>

            {error && <div className="error-message">{error}</div>}
            {loading ? (
              <div className="loading-message">Loading bookings...</div>
            ) : bookings.length > 0 ? (
              <div className="bookings-list">
                {bookings.map((booking) => (
                  <div key={booking.id} className="booking-item">
                    <div className="booking-avatar">
                      {(booking.workerName || 'W').charAt(0).toUpperCase()}
                      <span className="online-indicator"></span>
                    </div>
                    <div className="booking-content">
                      <h3 className="booking-title">
                        {booking.service} with {booking.workerName || 'Worker'}
                      </h3>
                      <p className="booking-date">
                        {booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : 'N/A'}
                        {booking.bookingTime && ` at ${formatTime24to12(booking.bookingTime)}`}
                      </p>
                    </div>
                    <div className="booking-actions">
                      {getStatusBadge(booking.status)}
                      {String(booking.status || '').toLowerCase().trim() === 'pending' && (
                        <button
                          className="btn-cancel-booking"
                          onClick={() => cancelBooking(booking.id)}
                          disabled={cancelingBookingId === booking.id}
                        >
                          {cancelingBookingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                        </button>
                      )}
                      <button className="btn-view-details">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <div className="clipboard-icon">
                    <div className="clipboard-top"></div>
                    <div className="clipboard-body"></div>
                    <div className="magnifier">🔍</div>
                  </div>
                </div>
                <p className="empty-state-title">No bookings found</p>
                <p className="empty-state-subtitle">Start by finding trusted workers near you.</p>
                <button className="btn-find-workers" onClick={() => navigate('/workers')}>
                  Find Workers
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => setShowProfileMenu(false)}
      />
    </div>
  )
}

