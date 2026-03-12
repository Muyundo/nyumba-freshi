import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import './Login.css'

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidPhone(value) {
  return /^(07|01)\d{8}$/.test(normalizePhone(value))
}

export default function Login() {
  const [role, setRole] = useState('Homeowner')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false)
  const [forgotStep, setForgotStep] = useState('verify-id')
  const [idNumber, setIdNumber] = useState('')
  const [forgotPhone, setForgotPhone] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('error')
  const navigate = useNavigate()
  const location = useLocation()

  function normalizeIdNumber(value) {
    return String(value || '').replace(/\D/g, '')
  }

  function isValidIdNumber(value) {
    return /^\d{7,9}$/.test(normalizeIdNumber(value))
  }

  function enterForgotPasswordFlow() {
    setForgotPasswordMode(true)
    setForgotStep('verify-id')
    setIdNumber('')
    setForgotPhone('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  function exitForgotPasswordFlow() {
    setForgotPasswordMode(false)
    setForgotStep('verify-id')
    setIdNumber('')
    setForgotPhone('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setMessage(null)
  }

  useEffect(() => {
    const state = location.state || {}
    if (state.role) setRole(state.role)
    if (state.phone) setPhone(normalizePhone(state.phone).slice(0, 10))
    if (state.fromRegister) {
      setMessage('Registration successful. Please log in.')
      setMessageType('success')
    }
  }, [location.state])

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!phone || !password) {
      setMessage('Please enter phone number and password')
      setMessageType('error')
      return
    }

    if (!isValidPhone(phone)) {
      setMessage('Invalid phone number. Use exactly 10 digits starting with 07 or 01.')
      setMessageType('error')
      return
    }

    try {
      const res = await api.login({ role, phone, password })
      if (res.token) localStorage.setItem('token', res.token)
      if (res.user) localStorage.setItem('currentUser', JSON.stringify(res.user))
      localStorage.setItem('userRole', role)
      navigate('/dashboard')
    } catch (err) {
      setMessage('Login failed: Invalid credentials or user does not exist')
      setMessageType('error')
    }
  }

  const verifyIdNumber = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!isValidIdNumber(idNumber)) {
      setMessage('Please enter a valid ID number (7 to 9 digits).')
      setMessageType('error')
      return
    }

    if (!isValidPhone(forgotPhone)) {
      setMessage('Please enter a valid phone number (10 digits starting with 07 or 01).')
      setMessageType('error')
      return
    }

    try {
      const res = await api.verifyWorkerIdForPasswordReset(idNumber, forgotPhone)
      setResetToken(res.resetToken)
      setForgotStep('reset-password')
      setMessage('ID number and phone number verified. Please set your new password.')
      setMessageType('success')
    } catch (err) {
      setMessage(err?.message || 'Failed to verify credentials. Please try again.')
      setMessageType('error')
    }
  }

  const resetWorkerPassword = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!newPassword || !confirmPassword) {
      setMessage('Please enter and confirm your new password.')
      setMessageType('error')
      return
    }

    if (newPassword.length < 6) {
      setMessage('New password must be at least 6 characters long.')
      setMessageType('error')
      return
    }

    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match.')
      setMessageType('error')
      return
    }

    try {
      await api.resetWorkerPassword(resetToken, newPassword)
      setMessage('Password reset successful. Please login with your new password.')
      setMessageType('success')
      setForgotPasswordMode(false)
      setForgotStep('verify-id')
      setIdNumber('')
      setResetToken('')
      setNewPassword('')
      setConfirmPassword('')
      setPassword('')
    } catch (err) {
      const errorText = String(err?.message || '')
      if (errorText.includes('Reset session expired')) {
        setMessage('Reset session expired. Please verify your ID number again.')
        setForgotStep('verify-id')
        setResetToken('')
      } else {
        setMessage('Failed to reset password. Please try again.')
      }
      setMessageType('error')
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <img src="/logo192.png" alt="HomeEase logo" />
            <span className="logo-text"></span>
          </div>
          <h1 className="login-title">{forgotPasswordMode ? 'Forgot Password' : 'Welcome'}</h1>
          <p className="login-subtitle">
            {forgotPasswordMode
              ? 'Verify your ID number and phone number to reset your password.'
              : 'Login as Homeowner or Worker to continue.'}
          </p>
        </div>

        {!forgotPasswordMode ? (
          <form className="login-form" onSubmit={submit}>
            <div className="form-group">
              <label>Login as</label>
              <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="Homeowner">Homeowner</option>
                <option value="Worker">Worker</option>
              </select>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input
                className="form-control"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(normalizePhone(e.target.value).slice(0, 10))}
                placeholder="07XXXXXXXX or 01XXXXXXXX"
                maxLength={10}
                inputMode="numeric"
              />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                className="form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {role === 'Worker' && (
              <button type="button" className="link-button" onClick={enterForgotPasswordFlow}>
                Forgot Password?
              </button>
            )}

            <button className="btn-primary" type="submit">Login</button>

            {message && (
              <div className={`message ${messageType}`}>
                {message}
              </div>
            )}
          </form>
        ) : (
          <>
            {forgotStep === 'verify-id' && (
              <form className="login-form" onSubmit={verifyIdNumber}>
                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    className="form-control"
                    type="text"
                    value={idNumber}
                    onChange={(e) => setIdNumber(normalizeIdNumber(e.target.value).slice(0, 9))}
                    placeholder="Enter your registered ID number"
                    maxLength={9}
                    inputMode="numeric"
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    className="form-control"
                    type="tel"
                    value={forgotPhone}
                    onChange={(e) => setForgotPhone(normalizePhone(e.target.value).slice(0, 10))}
                    placeholder="07XXXXXXXX or 01XXXXXXXX"
                    maxLength={10}
                    inputMode="numeric"
                  />
                </div>

                <button className="btn-primary" type="submit">Verify Credentials</button>
                <button type="button" className="link-button" onClick={exitForgotPasswordFlow}>
                  Back to Login
                </button>

                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}
              </form>
            )}

            {forgotStep === 'reset-password' && (
              <form className="login-form" onSubmit={resetWorkerPassword}>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <button className="btn-primary" type="submit">Reset Password</button>
                <button type="button" className="link-button" onClick={exitForgotPasswordFlow}>
                  Cancel
                </button>

                {message && (
                  <div className={`message ${messageType}`}>
                    {message}
                  </div>
                )}
              </form>
            )}
          </>
        )}

        <div className="footer-section">
          <p className="footer-text">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
