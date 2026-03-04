import React from 'react'
import { Link } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const services = [
    { id: 'cleaning', name: 'House Cleaning' },
    { id: 'laundry', name: 'Laundry' },
    { id: 'both', name: 'Cleaning + Laundry' },
  ]

  return (
    <div className="home-container">
      <h2>Find a Domestic Worker</h2>
      <p>Choose a service to see available workers in Nairobi.</p>
      <ul>
        {services.map((s) => (
          <li key={s.id}>
            <Link to={`/workers?service=${s.id}`}>{s.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
