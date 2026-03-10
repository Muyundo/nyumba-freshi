import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../api'
import './Register.css'

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidHomeownerPhone(value) {
  return /^07\d{8}$/.test(normalizePhone(value))
}

export default function Register() {
  const [role, setRole] = useState('Homeowner')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [estate, setEstate] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [servicesOffered, setServicesOffered] = useState({ cleaning: false, laundry: false })
  const [availability, setAvailability] = useState('both')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState(null)
  const [messageType, setMessageType] = useState('error')
  const navigate = useNavigate()

  const handleRoleChange = (nextRole) => {
    setRole(nextRole)
    if (nextRole === 'Homeowner') {
      setPhone((prev) => normalizePhone(prev).slice(0, 10))
    }
  }

  const handlePhoneChange = (value) => {
    if (role === 'Homeowner') {
      setPhone(normalizePhone(value).slice(0, 10))
      return
    }
    setPhone(value)
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage(null)
    if (!firstName || !lastName || !phone || !password) {
      setMessage('Please fill required fields')
      setMessageType('error')
      return
    }
    if (password !== confirm) {
      setMessage('Passwords do not match')
      setMessageType('error')
      return
    }

    if (role === 'Homeowner' && !isValidHomeownerPhone(phone)) {
      setMessage('Invalid phone number. Use exactly 10 digits starting with 07.')
      setMessageType('error')
      return
    }

    try {
      const payload = { role, firstName, lastName, phone, location, estate, password }
      if (role === 'Worker') {
        payload.idNumber = idNumber
        payload.servicesOffered = Object.keys(servicesOffered).filter((k) => servicesOffered[k])
        payload.availability = availability
      }
      await api.register(payload)
      navigate('/login', {
        state: {
          fromRegister: true,
          role,
          phone,
        },
      })
    } catch (err) {
      setMessage('Register error: ' + err.message)
      setMessageType('error')
    }
  }

  return (
    <div className="register-container">
      <div className="register-card">
        <div className="register-header">
          <div className="logo-section">
            <img src="/logo192.png" alt="HomeEase logo" />
            <span className="logo-text"></span>
          </div>
          <h2>Register</h2>
          <p className="register-sub">
            {role === 'Worker'
              ? "We'll use this to help connect you with home owners."
              : "We'll use this to help you book a worker near you."}
          </p>
        </div>

        <form className="register-form" onSubmit={submit}>
          <div className="form-group">
            <label>Register as</label>
            <select className="form-control" value={role} onChange={(e) => handleRoleChange(e.target.value)}>
              <option value="Homeowner">Homeowner</option>
              <option value="Worker">Worker</option>
            </select>
          </div>

          <div className="two-col">
            <div className="form-group">
              <label>First Name</label>
              <input 
                className="form-control" 
                type="text"
                value={firstName} 
                onChange={(e) => setFirstName(e.target.value)} 
                placeholder="First Name" 
              />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input 
                className="form-control" 
                type="text"
                value={lastName} 
                onChange={(e) => setLastName(e.target.value)} 
                placeholder="Last Name" 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input 
              className="form-control" 
              type="tel"
              value={phone} 
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder={role === 'Homeowner' ? '07XXXXXXXX' : '0712 345 678'}
              maxLength={role === 'Homeowner' ? 10 : undefined}
              inputMode={role === 'Homeowner' ? 'numeric' : undefined}
            />
          </div>

          {role === 'Worker' && (
            <>
              <div className="form-group">
                <label>ID Number</label>
                <input 
                  className="form-control" 
                  type="text"
                  value={idNumber} 
                  onChange={(e) => setIdNumber(e.target.value)} 
                  placeholder="ID Number" 
                />
              </div>

              <div className="form-group">
                <label>Services Offered</label>
                <div className="services-group">
                  <div className="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      id="cleaning"
                      checked={servicesOffered.cleaning} 
                      onChange={(e) => setServicesOffered((s) => ({ ...s, cleaning: e.target.checked }))} 
                    />
                    <label htmlFor="cleaning">Cleaning</label>
                  </div>
                  <div className="checkbox-wrapper">
                    <input 
                      type="checkbox" 
                      id="laundry"
                      checked={servicesOffered.laundry} 
                      onChange={(e) => setServicesOffered((s) => ({ ...s, laundry: e.target.checked }))} 
                    />
                    <label htmlFor="laundry">Laundry</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Availability</label>
                <div className="services-group">
                  <div className="radio-wrapper">
                    <input 
                      type="radio" 
                      id="weekdays"
                      name="avail" 
                      value="weekdays" 
                      checked={availability === 'weekdays'} 
                      onChange={(e) => setAvailability(e.target.value)} 
                    />
                    <label htmlFor="weekdays">Weekdays</label>
                  </div>
                  <div className="radio-wrapper">
                    <input 
                      type="radio" 
                      id="weekends"
                      name="avail" 
                      value="weekends" 
                      checked={availability === 'weekends'} 
                      onChange={(e) => setAvailability(e.target.value)} 
                    />
                    <label htmlFor="weekends">Weekends</label>
                  </div>
                  <div className="radio-wrapper">
                    <input 
                      type="radio" 
                      id="both"
                      name="avail" 
                      value="both" 
                      checked={availability === 'both'} 
                      onChange={(e) => setAvailability(e.target.value)} 
                    />
                    <label htmlFor="both">Both</label>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="two-col">
            <div className="form-group">
              <label>Location</label>
              <input 
                className="form-control" 
                type="text"
                value={location} 
                onChange={(e) => setLocation(e.target.value)} 
                placeholder="Estate / Area" 
              />
            </div>
            <div className="form-group">
              <label>Estate / Area</label>
              <input 
                className="form-control" 
                type="text"
                value={estate} 
                onChange={(e) => setEstate(e.target.value)} 
                placeholder="Estate / Area" 
              />
            </div>
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

          <div className="form-group">
            <label>Confirm Password</label>
            <input 
              className="form-control" 
              type="password" 
              value={confirm} 
              onChange={(e) => setConfirm(e.target.value)} 
              placeholder="••••••••"
            />
          </div>

          <button className="btn-primary" type="submit">Register</button>
          
          {message && (
            <div className={`message ${messageType}`}>
              {message}
            </div>
          )}
        </form>

        <div className="footer-section">
          <p className="footer-text">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
