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
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('error')
  const navigate = useNavigate()
  const location = useLocation()

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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-section">
            <img src="/logo192.png" alt="HomeEase logo" />
            <span className="logo-text"></span>
          </div>
          <h1 className="login-title">Welcome</h1>
          <p className="login-subtitle">Login as Homeowner or Worker to continue.</p>
        </div>

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

          <button className="btn-primary" type="submit">Login</button>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
        </form>

        <div className="footer-section">
          <p className="footer-text">
            Don&apos;t have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
