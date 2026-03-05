import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const currentUser = localStorage.getItem('currentUser')
  const userRole = localStorage.getItem('userRole')
  
  // Parse user data if available
  let userName = 'User'
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser)
      userName = user.fullName || user.email || 'User'
    } catch (e) {
      // If not JSON, use as is
      userName = currentUser
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('userRole')
    navigate('/login', { replace: true })
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/dashboard" className="header-logo">
          <span className="logo-icon">🏠</span>
          <span className="logo-text">HomeEase</span>
        </Link>

        <nav className="header-nav">
          <Link to="/" className="nav-link">Find Workers</Link>
          {userRole === 'HomeOwner' && (
            <Link to="/dashboard" className="nav-link">My Bookings</Link>
          )}
          {userRole === 'Worker' && (
            <Link to="/dashboard" className="nav-link">My Profile</Link>
          )}
        </nav>

        <div className="header-user">
          <div className="user-profile-trigger" onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className="user-avatar">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{userName}</span>
            <span className="dropdown-arrow">▼</span>
          </div>

          {showUserMenu && (
            <div className="user-menu">
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
