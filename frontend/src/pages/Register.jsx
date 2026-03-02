import React, { useState } from 'react'
import api from '../api'
import './Register.css'

export default function Register() {
  const [role, setRole] = useState('Homeowner')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [estate, setEstate] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [servicesOffered, setServicesOffered] = useState({ cleaning: false, laundry: false })
  const [availability, setAvailability] = useState('both')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!fullName || !phone || !password) {
      setMessage('Please fill required fields')
      return
    }
    if (password !== confirm) {
      setMessage('Passwords do not match')
      return
    }

    try {
      const payload = { role, fullName, phone, location, estate, password }
      if (role === 'Worker') {
        payload.idNumber = idNumber
        payload.servicesOffered = Object.keys(servicesOffered).filter((k) => servicesOffered[k])
        payload.availability = availability
      }
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.token) localStorage.setItem('token', data.token)
        setMessage('Registered successfully (demo).')
      } else {
        const txt = await res.text()
        setMessage('Register failed: ' + txt)
      }
    } catch (err) {
      setMessage('Register error: ' + err.message)
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <img src="/logo192.png" alt="logo" />
          <h2>Register</h2>
          <div className="register-sub">
            {role === 'Worker'
              ? "We'll use this to help connect you with home owners."
              : "We'll use this to help you book a worker near you."}
          </div>
        </div>

        <form className="register-form" onSubmit={submit}>
          <div className="form-group">
            <label>Register as</label>
            <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Homeowner</option>
              <option>Worker</option>
            </select>
          </div>

            <div className="form-group">
              <label>Full Name</label>
              <input className="form-control" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
            </div>

            {role === 'Worker' && (
              <>
                <div className="form-group">
                  <label>ID Number</label>
                  <input className="form-control" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="ID Number" />
                </div>

                <div className="form-group">
                  <label>Services Offered</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={servicesOffered.cleaning} onChange={(e) => setServicesOffered((s) => ({ ...s, cleaning: e.target.checked }))} />
                      Cleaning
                    </label>
                    <label style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input type="checkbox" checked={servicesOffered.laundry} onChange={(e) => setServicesOffered((s) => ({ ...s, laundry: e.target.checked }))} />
                      Laundry
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Availability</label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <label><input type="radio" name="avail" value="weekdays" checked={availability === 'weekdays'} onChange={(e) => setAvailability(e.target.value)} /> Weekdays</label>
                    <label><input type="radio" name="avail" value="weekends" checked={availability === 'weekends'} onChange={(e) => setAvailability(e.target.value)} /> Weekends</label>
                    <label><input type="radio" name="avail" value="both" checked={availability === 'both'} onChange={(e) => setAvailability(e.target.value)} /> Both</label>
                  </div>
                </div>
              </>
            )}

          <div className="two-col">
            <div className="form-group">
              <label>Location</label>
              <input className="form-control" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Estate / Area" />
            </div>
            <div className="form-group">
              <label>Estate / Area</label>
              <input className="form-control" value={estate} onChange={(e) => setEstate(e.target.value)} placeholder="Estate / Area" />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input className="form-control" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </div>

          <button className="btn-primary" type="submit">Register</button>
          {message && <div className={`message ${message.startsWith('Register failed') || message.startsWith('Register error') || message === 'Passwords do not match' ? 'error' : ''}`}>{message}</div>}
        </form>

        <div className="footer-note">
          Already have an account? <a href="/login">Login</a>
        </div>
      </div>
    </div>
  )
}
