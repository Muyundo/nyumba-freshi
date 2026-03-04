import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bookings')
  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (error) {
    currentUser = null
  }
  const displayName = currentUser?.fullName || 'User'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    navigate('/login')
  }

  // Demo data for upcoming bookings
  const upcomingBookings = [
    { 
      id: 1, 
      service: 'Cleaning Service',
      worker: 'Grace A.',
      date: 'Tomorrow',
      time: '10:00 AM',
      status: 'Accepted',
      image: '👩‍🔧'
    },
    { 
      id: 2, 
      service: 'Plumbing Repair',
      worker: 'John M.',
      date: 'March 7',
      time: '2:00 PM',
      status: 'Pending',
      image: '👨‍🔧'
    }
  ]

  const allBookings = [
    ...upcomingBookings,
    { 
      id: 3, 
      service: 'Electrical Work',
      worker: 'Sarah K.',
      date: 'March 1',
      time: '9:00 AM',
      status: 'Completed',
      image: '👩‍💼'
    }
  ]

  return (
    <div className="dashboard-container">
      {/* Header with navigation */}
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

      {/* Main content */}
      <main className="dashboard-main">
        {activeTab === 'bookings' ? (
          <>
            {/* Welcome section */}
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome back, {displayName}!</h1>
              <p className="welcome-subtitle">What can we help you with today?</p>
            </div>

            {/* Upcoming bookings */}
            {upcomingBookings.length > 0 && (
              <section className="upcoming-section">
                <h2 className="section-title">📅 Upcoming Booking</h2>
                <div className="bookings-list">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="booking-card">
                      <div className="booking-image">{booking.image}</div>
                      <div className="booking-info">
                        <h3 className="booking-service">
                          {booking.service} <span className="booking-worker">with {booking.worker}</span>
                        </h3>
                        <p className="booking-datetime">{booking.date}, {booking.time}</p>
                        <p className={`booking-status status-${booking.status.toLowerCase()}`}>
                          Status: {booking.status} 
                          {booking.status === 'Accepted' && ' ✓'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Action cards */}
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
            {/* My Bookings tab */}
            <div className="welcome-section">
              <h1 className="welcome-title">My Bookings</h1>
              <p className="welcome-subtitle">Track all your service bookings</p>
            </div>

            <section className="bookings-section">
              <div className="bookings-list">
                {allBookings.map((booking) => (
                  <div key={booking.id} className="booking-card">
                    <div className="booking-image">{booking.image}</div>
                    <div className="booking-info">
                      <h3 className="booking-service">
                        {booking.service} <span className="booking-worker">with {booking.worker}</span>
                      </h3>
                      <p className="booking-datetime">{booking.date}, {booking.time}</p>
                      <p className={`booking-status status-${booking.status.toLowerCase()}`}>
                        Status: {booking.status}
                        {booking.status === 'Accepted' && ' ✓'}
                        {booking.status === 'Completed' && ' ✓✓'}
                      </p>
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
