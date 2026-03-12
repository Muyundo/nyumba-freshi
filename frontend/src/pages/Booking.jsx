import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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

function getTodayDateString() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getCurrentTimeString() {
  const now = new Date()
  const rounded = new Date(now)
  rounded.setSeconds(0, 0)

  if (rounded.getMinutes() > 0) {
    rounded.setHours(rounded.getHours() + 1, 0, 0, 0)
  }

  const hours = String(rounded.getHours()).padStart(2, '0')
  return `${hours}:00`
}

function timeToMinutes(value) {
  const [hours, minutes] = String(value || '').split(':').map((part) => Number(part))
  return (hours * 60) + minutes
}

function isWholeHourTime(value) {
  return /^\d{2}:00$/.test(String(value || '').trim())
}

function hasOneHourConflict(selectedTime, existingTimes) {
  if (!selectedTime) return false
  const selectedMinutes = timeToMinutes(selectedTime)
  return (existingTimes || []).some((existingTime) => Math.abs(selectedMinutes - timeToMinutes(existingTime)) < 60)
}

function isPastBookingDateTime(selectedDate, selectedTime) {
  if (!selectedDate || !selectedTime) return false
  const bookingDateTime = new Date(`${selectedDate}T${selectedTime}:00`)
  const now = new Date()
  now.setSeconds(0, 0)
  return bookingDateTime < now
}

function getHourOptions(minTime) {
  const minHour = minTime ? Number(String(minTime).split(':')[0]) : 0
  const options = []

  for (let hour = minHour; hour < 24; hour += 1) {
    const value = `${String(hour).padStart(2, '0')}:00`
    options.push({ value, label: formatTime24to12(value) })
  }

  return options
}

export default function Booking() {
  const { workerId } = useParams()
  const location = useLocation()
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [workerName, setWorkerName] = useState('')
  const [availableServices, setAvailableServices] = useState([])
  const [selectedServices, setSelectedServices] = useState({ cleaning: false, laundry: false })
  const [bookedTimes, setBookedTimes] = useState([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()
  const todayDate = getTodayDateString()
  const minTime = date === todayDate ? getCurrentTimeString() : ''
  const availableHourOptions = getHourOptions(minTime)
  const isAvailabilityMode = new URLSearchParams(location.search).get('mode') === 'availability'

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

  useEffect(() => {
    const loadAvailability = async () => {
      if (!workerId || !date) {
        setBookedTimes([])
        setAvailabilityError('')
        return
      }

      setAvailabilityLoading(true)
      setAvailabilityError('')
      try {
        const availability = await api.getWorkerAvailability(workerId, date)
        setBookedTimes(Array.isArray(availability?.bookedTimes) ? availability.bookedTimes : [])
      } catch (error) {
        console.error('Load worker availability error', error)
        setBookedTimes([])
        setAvailabilityError('Failed to load booked times. You can still try booking.')
      } finally {
        setAvailabilityLoading(false)
      }
    }

    loadAvailability()
  }, [workerId, date])

  const supportsBoth = availableServices.includes('cleaning') && availableServices.includes('laundry')
  const isSelectedTimeBooked = Boolean(time && hasOneHourConflict(time, bookedTimes))

  const showBookedTimesPopup = (times) => {
    const formatted = (times || []).map((t) => formatTime24to12(t)).join(', ')
    window.alert(`This worker is already booked at: ${formatted}`)
  }

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

    if (!isWholeHourTime(time)) {
      setMessage('Please book time in full hours e.g 7:00, 8:00')
      return
    }

    if (isSelectedTimeBooked) {
      setMessage('Selected time is already booked. Please choose another available time.')
      showBookedTimesPopup(bookedTimes)
      return
    }

    if (isPastBookingDateTime(date, time)) {
      setMessage('Booking date and time cannot be in the past. Please choose a current or future time.')
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

      if (error?.status === 409 && Array.isArray(error?.data?.bookedTimes)) {
        showBookedTimesPopup(error.data.bookedTimes)
        setMessage(error?.message || 'That time is already booked. Please choose another time.')
        setBookedTimes(error.data.bookedTimes)
        return
      }

      setMessage('Failed to create booking: ' + (error?.message || 'Unknown error'))
    }
  }

  return (
    <div className="booking-page">
      <Header />
      <div className="booking-container">
        <h1>Book {workerName || `Worker ${workerId}`}</h1>
        {isAvailabilityMode && (
          <div className="booking-message success">
            Check this worker&apos;s booked times first, then choose an available slot.
          </div>
        )}
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
              min={todayDate}
              onChange={(e) => {
                const nextDate = e.target.value
                setDate(nextDate)

                if (nextDate === todayDate && time && time < getCurrentTimeString()) {
                  setTime('')
                }
              }} 
              required 
            />
          </div>
          <div className="booking-form-group">
            <label htmlFor="time">Time (AM/PM)</label>
            <select
              id="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date || availableHourOptions.length === 0}
              required
            >
              <option value="" disabled>
                {!date
                  ? 'Select a date first'
                  : availableHourOptions.length === 0
                    ? 'No available hours left today'
                    : 'Select hour'}
              </option>
              {availableHourOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {time && <p className="time-display">{formatTime24to12(time)}</p>}
            {availabilityLoading && <p className="availability-info">Checking worker availability...</p>}
            {availabilityError && <p className="availability-error">{availabilityError}</p>}
            {!availabilityLoading && !availabilityError && date && bookedTimes.length > 0 && (
              <div className="booked-times-box">
                <p className="booked-times-title">Already booked at (each booking blocks 1 hour):</p>
                <div className="booked-times-list">
                  {bookedTimes.map((bookedTime) => (
                    <span key={bookedTime} className="booked-time-chip">{formatTime24to12(bookedTime)}</span>
                  ))}
                </div>
              </div>
            )}
            {!availabilityLoading && !availabilityError && date && bookedTimes.length === 0 && (
              <p className="availability-success">No accepted bookings for this date yet.</p>
            )}
            {isSelectedTimeBooked && (
              <p className="availability-error">That time is already booked. Please select another time.</p>
            )}
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
          <button className="booking-submit" type="submit" disabled={isSelectedTimeBooked}>
            {isSelectedTimeBooked ? 'Pick Another Time' : 'Request Booking'}
          </button>
        </form>
      </div>
    </div>
  )
}
