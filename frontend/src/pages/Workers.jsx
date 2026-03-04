import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import api from '../api'
import './Workers.css'

function normalizeServiceKey(service) {
  const value = String(service || '').toLowerCase().trim()
  if (value.includes('clean')) return 'cleaning'
  if (value.includes('laundry')) return 'laundry'
  return value
}

function getReadableServiceFilter(service) {
  if (service === 'cleaning') return 'House Cleaning'
  if (service === 'laundry') return 'Laundry'
  if (service === 'both') return 'Cleaning + Laundry'
  return service
}

export default function Workers() {
  const [searchParams, setSearchParams] = useSearchParams()
  const rawService = searchParams.get('service') || 'all'
  const serviceFilter = normalizeServiceKey(rawService)
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const handleFilterChange = (event) => {
    const nextFilter = event.target.value
    if (nextFilter === 'all') {
      setSearchParams({})
      return
    }
    setSearchParams({ service: nextFilter })
  }

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true)
        setError(null)
        const workers = await api.getWorkers()
        
        // Filter by service if provided
        let filteredWorkers = workers
        if (serviceFilter !== 'all') {
          const normalizedFilter = normalizeServiceKey(serviceFilter)
          filteredWorkers = workers.filter((w) => {
            const workerServices = (w.services || []).map((item) => normalizeServiceKey(item))

            if (normalizedFilter === 'both') {
              return workerServices.includes('cleaning') && workerServices.includes('laundry')
            }

            return workerServices.includes(normalizedFilter)
          })
        }
        
        setList(filteredWorkers)
      } catch (err) {
        console.error('Failed to fetch workers:', err)
        setError('Failed to load workers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkers()
  }, [serviceFilter])

  return (
    <div className="workers-container">
      <h2>Workers</h2>
      <div className="workers-filter-bar">
        <label className="workers-filter-label" htmlFor="serviceFilter">Filter by service</label>
        <select
          id="serviceFilter"
          className="workers-filter-select"
          value={serviceFilter}
          onChange={handleFilterChange}
        >
          <option value="all">All Services</option>
          <option value="cleaning">House Cleaning</option>
          <option value="laundry">Laundry</option>
          <option value="both">Cleaning + Laundry</option>
        </select>
      </div>

      {serviceFilter !== 'all' && <p>Filtering by service: {getReadableServiceFilter(serviceFilter)}</p>}
      
      {loading && <p className="loading-message">Loading workers...</p>}
      {error && <p className="error-message">{error}</p>}
      
      {!loading && list.length === 0 && (
        <p className="empty-message">
          {serviceFilter !== 'all' ? 'No workers found for this service.' : 'No workers available.'}
        </p>
      )}
      
      <ul>
        {list.map((w) => (
          <li key={w.id}>
            <div>
              <Link to={`/workers/${w.id}`}>{w.fullName}</Link>
              <div className="worker-services">
                {w.services && w.services.length > 0 
                  ? w.services.join(', ') 
                  : 'No services listed'}
              </div>
            </div>
            <div className="worker-actions">
              <Link to={`/booking/${w.id}`}>Book Now</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
