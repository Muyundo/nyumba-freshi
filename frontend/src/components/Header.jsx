import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
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

  const closePasswordModal = () => {
    if (isSubmittingPassword) return
    setShowPasswordModal(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
    setPasswordSuccess('')
  }

  const handlePasswordSubmit = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }

    setIsSubmittingPassword(true)
    try {
      await api.changePassword(oldPassword, newPassword)
      setPasswordSuccess('Password changed successfully')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const message = String(err?.message || '')
      if (message.includes('Current password is incorrect')) {
        setPasswordError('Current password is incorrect')
      } else {
        setPasswordError('Failed to change password. Please try again.')
      }
    } finally {
      setIsSubmittingPassword(false)
    }
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
              {userRole === 'Worker' && (
                <button
                  onClick={() => {
                    setShowUserMenu(false)
                    setShowPasswordModal(true)
                  }}
                  className="menu-btn"
                >
                  Change Password
                </button>
              )}
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {showPasswordModal && (
        <div className="header-modal-overlay" onClick={closePasswordModal}>
          <div className="header-modal" onClick={(event) => event.stopPropagation()}>
            <div className="header-modal-title-row">
              <h3>Change Password</h3>
              <button type="button" className="header-modal-close" onClick={closePasswordModal}>✕</button>
            </div>

            <form className="header-password-form" onSubmit={handlePasswordSubmit}>
              {passwordError && <div className="header-form-error">{passwordError}</div>}
              {passwordSuccess && <div className="header-form-success">{passwordSuccess}</div>}

              <label htmlFor="header-old-password">Current Password</label>
              <input
                id="header-old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                disabled={isSubmittingPassword}
              />

              <label htmlFor="header-new-password">New Password</label>
              <input
                id="header-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={isSubmittingPassword}
              />

              <label htmlFor="header-confirm-password">Confirm New Password</label>
              <input
                id="header-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={isSubmittingPassword}
              />

              <div className="header-modal-actions">
                <button type="button" className="header-btn-secondary" onClick={closePasswordModal} disabled={isSubmittingPassword}>
                  Cancel
                </button>
                <button type="submit" className="header-btn-primary" disabled={isSubmittingPassword}>
                  {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  )
}
