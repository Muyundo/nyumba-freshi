import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()
  const token = localStorage.getItem('token')
  const userRole = localStorage.getItem('userRole')

  useEffect(() => {
    // Redirect to dashboard for authenticated users
    if (token) {
      navigate('/dashboard', { replace: true })
    }
    // Redirect to login if not authenticated
    if (!token) {
      navigate('/login', { replace: true })
    }
  }, [token, navigate])

  const services = [
    { id: 'cleaning', name: 'House Cleaning' },
    { id: 'laundry', name: 'Laundry' },
    { id: 'both', name: 'Cleaning + Laundry' },
  ]

  // Don't render anything while redirecting
  if (!token) {
    return null
  }

  return (
    <div className="home-page">
      <Header />
      <div className="home-container">
        <h1>Find a Domestic Worker</h1>
        <p>Choose a service to see available workers in Nairobi.</p>
        <ul>
          {services.map((s) => (
            <li key={s.id}>
              <Link to={`/workers?service=${s.id}`}>{s.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
