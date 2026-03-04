import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Workers.css'

// Dummy data for MVP — in real app this would come from API
const DUMMY_WORKERS = [
  { id: 1, name: 'Asha', services: ['cleaning'] },
  { id: 2, name: 'John', services: ['laundry'] },
  { id: 3, name: 'Mary', services: ['cleaning', 'laundry'] },
]

function useQuery() {
  return new URLSearchParams(useLocation().search)
}

export default function Workers() {
  const q = useQuery()
  const service = q.get('service')
  const [list, setList] = useState([])

  useEffect(() => {
    // filter dummy workers by service
    const results = DUMMY_WORKERS.filter((w) => !service || w.services.includes(service))
    setList(results)
  }, [service])

  return (
    <div className="workers-container">
      <h2>Workers</h2>
      {service && <p>Filtering by service: {service}</p>}
      <ul>
        {list.map((w) => (
          <li key={w.id}>
            <div>
              <Link to={`/workers/${w.id}`}>{w.name}</Link>
              <div className="worker-services">{w.services.join(', ')}</div>
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
