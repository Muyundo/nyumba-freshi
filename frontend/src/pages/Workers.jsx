import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api from '../api'
import './Workers.css'

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function Workers() {
  const q = useQuery()
  const service = q.get('service')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true)
        setError(null)
        const workers = await api.getWorkers()
        
        // Filter by service if provided
        let filteredWorkers = workers
        if (service) {
          filteredWorkers = workers.filter((w) => 
            w.services && w.services.some(s => s.toLowerCase() === service.toLowerCase())
          )
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
  }, [service])

  return (
    <div className="workers-container">
      <h2>Workers</h2>
      {service && <p>Filtering by service: {service}</p>}
      
      {loading && <p className="loading-message">Loading workers...</p>}
      {error && <p className="error-message">{error}</p>}
      
      {!loading && list.length === 0 && (
        <p className="empty-message">
          {service ? 'No workers found for this service.' : 'No workers available.'}
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
