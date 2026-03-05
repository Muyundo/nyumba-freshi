import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'
import Header from '../components/Header'
import './Booking.css'

const SERVICE_KEYS = {
  cleaning: 'House Cleaning',
  laundry: 'Laundry',
}

function normalizeServiceKey(service) {
  const value = String(service || '').toLowerCase().trim()
  if (value.includes('clean')) return 'cleaning'
  if (value.includes('laundry')) return 'laundry'
  return value
}

function formatTime24to12(time24) {
  if (!time24) return ''
  const [hours, minutes] = time24.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

export default function Booking() {
  const { workerId } = useParams()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [availableServices, setAvailableServices] = useState([])
  const [selectedServices, setSelectedServices] = useState({ cleaning: false, laundry: false })
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const loadWorker = async () => {
      try {
        const worker = await api.getWorker(workerId)
        setWorkerName(worker?.fullName || '')
        const normalizedServices = Array.from(
          new Set((worker?.services || []).map((service) => normalizeServiceKey(service)).filter(Boolean))
        )
        setAvailableServices(normalizedServices)

        if (normalizedServices.length === 1) {
          const onlyService = normalizedServices[0]
          setSelectedServices({
            cleaning: onlyService === 'cleaning',
            laundry: onlyService === 'laundry',
          })
        }
      } catch (error) {
        setWorkerName('')
        setAvailableServices([])
      }
    }

    if (workerId) {
      loadWorker()
    }
  }, [workerId])

  const supportsBoth = availableServices.includes('cleaning') && availableServices.includes('laundry')

  const onToggleSingleService = (serviceKey, checked) => {
    setMessage('')
    setSelectedServices((prev) => ({ ...prev, [serviceKey]: checked }))
  }

  const onToggleBoth = (checked) => {
    setMessage('')
    setSelectedServices({ cleaning: checked, laundry: checked })
  }

  const submit = async (e) => {
    e.preventDefault()
    setMessage('')

    const chosenServices = Object.keys(selectedServices).filter((key) => selectedServices[key])
    if (chosenServices.length === 0) {
      setMessage('Please select at least one service')
      return
    }

    if (!date) {
      setMessage('Please select a date')
      return
    }

    if (!time) {
      setMessage('Please select a time')
      return
    }

    try {
      const serviceString = chosenServices.map((key) => SERVICE_KEYS[key] || key).join(' + ')
      const payload = {
        workerId: parseInt(workerId, 10),
        service: serviceString,
        bookingDate: date,
        bookingTime: time,
        notes: notes || '',
      }

      await api.createBooking(payload)
      setMessage('Booking requested successfully! Waiting for worker to respond.')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (error) {
      console.error('Booking error', error)
      setMessage('Failed to create booking: ' + (error?.message || 'Unknown error'))
    }
  }

  return (
    <div className="booking-page">
      <Header />
      <div className="booking-container">
        <h1>Book {workerName || `Worker ${workerId}`}</h1>
        {message && <div className={`booking-message ${message.includes('successfully') ? 'success' : 'error'}`}>{message}</div>}
        <form className="booking-form" onSubmit={submit}>
          <div className="booking-form-group">
            <label>Service Type</label>
            <div className="service-options">
              {availableServices.includes('cleaning') && (
                <label className="service-option">
                  <input
                    type="checkbox"
                    checked={selectedServices.cleaning}
                    onChange={(e) => onToggleSingleService('cleaning', e.target.checked)}
                  />
                  House Cleaning
                </label>
              )}
              {availableServices.includes('laundry') && (
                <label className="service-option">
                  <input
                    type="checkbox"
                    checked={selectedServices.laundry}
                    onChange={(e) => onToggleSingleService('laundry', e.target.checked)}
                  />
                  Laundry
                </label>
              )}
              {supportsBoth && (
                <label className="service-option">
                  <input
                    type="checkbox"
                    checked={selectedServices.cleaning && selectedServices.laundry}
                    onChange={(e) => onToggleBoth(e.target.checked)}
                  />
                  Both
                </label>
              )}
            </div>
          </div>
          <div className="booking-form-group">
            <label htmlFor="date">Date</label>
            <input 
              id="date"
              type="date" 
              value={date} 
              onChange={(e) => setDate(e.target.value)} 
              required 
            />
          </div>
          <div className="booking-form-group">
            <label htmlFor="time">Time (AM/PM)</label>
            <input 
              id="time"
              type="time" 
              value={time} 
              onChange={(e) => setTime(e.target.value)} 
              required 
            />
            {time && <p className="time-display">{formatTime24to12(time)}</p>}
          </div>
          <div className="booking-form-group">
            <label htmlFor="notes">Notes</label>
            <textarea 
              id="notes"
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special instructions or details for the worker..."
            />
          </div>
          <button className="booking-submit" type="submit">Request Booking</button>
        </form>
      </div>
    </div>
  )
}
