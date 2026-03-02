import React, { useState } from 'react'
import api from '../api'

export default function Register() {
  const [role, setRole] = useState('Homeowner')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [estate, setEstate] = useState('')
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

    // Attempt register — backend endpoint may not exist in this MVP; handle gracefully
    try {
      const payload = {
        role,
        fullName,
        phone,
        location,
        estate,
        password,
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
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <img src="/logo192.png" alt="logo" style={{ height: 48 }} />
        <h2>Register</h2>
      </div>
      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <label>
          Register as
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option>Homeowner</option>
            <option>Worker</option>
          </select>
        </label>

        <label>
          Full Name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full Name" />
        </label>

        <label>
          Phone Number
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ flex: 1 }}>
            Location
            <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Estate / Area" />
          </label>
          <label style={{ flex: 1 }}>
            Estate / Area
            <input value={estate} onChange={(e) => setEstate(e.target.value)} placeholder="Estate / Area" />
          </label>
        </div>

        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <label>
          Confirm Password
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </label>

        <button type="submit" style={{ padding: '8px 12px', background: '#1565c0', color: '#fff', border: 'none' }}>Register</button>
        {message && <div style={{ marginTop: 8 }}>{message}</div>}
      </form>
      <p style={{ marginTop: 12, textAlign: 'center' }}>
        Already have an account? <a href="/login">Login</a>
      </p>
    </div>
  )
}
