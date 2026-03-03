import React from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Workers from './pages/Workers'
import WorkerProfile from './pages/WorkerProfile'
import Booking from './pages/Booking'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const currentUser = localStorage.getItem('currentUser')

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header style={{ padding: 12, borderBottom: '1px solid #eee' }}>
          <nav style={{ display: 'flex', gap: 12 }}>
            <Link to="/">Home</Link>
            <Link to="/workers">Workers</Link>
            <Link to="/login">Login</Link>
            <Link to="/dashboard">Dashboard</Link>
          </nav>
        </header>

        <main style={{ padding: 12 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/workers" element={<Workers />} />
            <Route path="/workers/:id" element={<WorkerProfile />} />
            <Route path="/booking/:workerId" element={<Booking />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
