import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bookings')
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (parseError) {
    currentUser = null
  }

  const displayName = currentUser?.fullName || 'User'
  const homeownerId = currentUser?.userId || currentUser?.id

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  const formatStatusLabel = (status) => {
    const normalizedStatus = String(status || '').toLowerCase().trim()
    if (normalizedStatus === 'accepted') return 'Booking Accepted'
    if (normalizedStatus === 'declined') return 'Booking Declined'
    if (normalizedStatus === 'cancelled') return 'Booking Cancelled'
    return 'Booking Pending'
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
    return ['pending', 'accepted', 'declined', 'cancelled'].includes(normalizedStatus)
  })

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            Find Workers
          </button>
          <button
            className={`nav-tab ${activeTab === 'myBookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('myBookings')}
          >
            My Bookings
          </button>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <main className="dashboard-main">
        {activeTab === 'bookings' ? (
          <>
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome back, {displayName}!</h1>
              <p className="welcome-subtitle">What can we help you with today?</p>
            </div>

            {error && <div className="dashboard-message error">{error}</div>}
            {loading ? (
              <div className="dashboard-message">Loading bookings...</div>
            ) : upcomingBookings.length > 0 ? (
              <section className="upcoming-section">
                <h2 className="section-title">📅 Upcoming Booking{upcomingBookings.length > 1 ? 's' : ''}</h2>
                <div className="bookings-list">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-image">👷</div>
                      <div className="booking-info">
                        <h3 className="booking-service">
                          {booking.service} <span className="booking-worker">with {booking.workerName || 'Worker'}</span>
                        </h3>
                        <p className="booking-datetime">{booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A'}</p>
                        <p className={`booking-status status-${String(booking.status || '').toLowerCase().trim()}`}>
                          Status: {formatStatusLabel(booking.status)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="dashboard-message">No upcoming bookings yet.</div>
            )}

            <section className="actions-section">
              <div className="action-card find-workers" onClick={() => navigate('/workers')}>
                <div className="action-icon">🔍</div>
                <h3>Find Workers</h3>
                <p>Browse & book services</p>
              </div>
              <div className="action-card my-bookings" onClick={() => setActiveTab('myBookings')}>
                <div className="action-icon">📋</div>
                <h3>My Bookings</h3>
                <p>View your appointments</p>
              </div>
            </section>
          </>
        ) : (
          <>
            <div className="welcome-section">
              <h1 className="welcome-title">My Bookings</h1>
              <p className="welcome-subtitle">Track all your service bookings</p>
            </div>

            {error && <div className="dashboard-message error">{error}</div>}
            {loading ? (
              <div className="dashboard-message">Loading bookings...</div>
            ) : bookings.length > 0 ? (
              <section className="bookings-section">
                <div className="bookings-list">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-image">👷</div>
                      <div className="booking-info">
                        <h3 className="booking-service">
                          {booking.service} <span className="booking-worker">with {booking.workerName || 'Worker'}</span>
                        </h3>
                        <p className="booking-datetime">{booking.bookingDate ? new Date(booking.bookingDate).toLocaleDateString() : 'N/A'}</p>
                        <p className={`booking-status status-${String(booking.status || '').toLowerCase().trim()}`}>
                          Status: {formatStatusLabel(booking.status)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="dashboard-message">No bookings found yet.</div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
