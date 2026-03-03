import React, { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

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
    <div>
      <h2>Workers</h2>
      {service && <p>Filtering by service: {service}</p>}
      <ul>
        {list.map((w) => (
          <li key={w.id}>
            <Link to={`/workers/${w.id}`}>{w.name}</Link> — {w.services.join(', ')}{' '}
            <Link to={`/booking/${w.id}`} style={{ marginLeft: 8 }}>
              Book
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
