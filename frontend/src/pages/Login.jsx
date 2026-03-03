import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import api from '../api'
import './Register.css'

export default function Login() {
  const [role, setRole] = useState('Homeowner')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const state = location.state || {}
    if (state.role) setRole(state.role)
    if (state.phone) setPhone(state.phone)
    if (state.fromRegister) setMessage('Registration successful. Please log in.')
  }, [location.state])

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!phone || !password) {
      setMessage('Please enter phone number and password')
      return
    }

    try {
      const res = await api.login({ role, phone, password })
      if (res.token) localStorage.setItem('token', res.token)
      if (res.user) localStorage.setItem('currentUser', JSON.stringify(res.user))
      navigate('/dashboard')
    } catch (err) {
      setMessage('Login failed: Invalid credentials or user does not exist')
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <img src="/logo192.png" alt="logo" />
          <h2>Login</h2>
          <div className="register-sub">Login as Homeowner or Worker to continue.</div>
        </div>

        <form className="register-form" onSubmit={submit}>
          <div className="form-group">
            <label>Login as</label>
            <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Homeowner</option>
              <option>Worker</option>
            </select>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
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
          {message && <div className={`message ${message.startsWith('Login failed') ? 'error' : ''}`}>{message}</div>}
        </form>

        <div className="footer-note">
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </div>
      </div>
    </div>
  )
}
