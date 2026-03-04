import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { setTokenExpiredCallback } from './api'
import Home from './pages/Home'
import Login from './pages/Login'
import Workers from './pages/Workers'
import WorkerProfile from './pages/WorkerProfile'
import Booking from './pages/Booking'
import Dashboard from './pages/Dashboard'
import WorkerDashboard from './pages/WorkerDashboard'
import Register from './pages/Register'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('token')
  const currentUser = localStorage.getItem('currentUser')

  if (!token || !currentUser) {
    return <Navigate to="/login" replace />
  }

  return children
}

function DashboardRouter() {
  const userRole = localStorage.getItem('userRole')
  
  if (userRole === 'Worker') {
    return <WorkerDashboard />
  }
  
  return <Dashboard />
}

function AppRoutes() {
  const navigate = useNavigate()

  useEffect(() => {
    // Set up token expiration callback
    setTokenExpiredCallback(() => {
      navigate('/login', { replace: true })
    })
  }, [navigate])

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/workers"
        element={
          <ProtectedRoute>
            <Workers />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workers/:id"
        element={
          <ProtectedRoute>
            <WorkerProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/booking/:workerId"
        element={
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardRouter />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <main style={{ padding: 12 }}>
          <AppRoutes />
        </main>
      </div>
    </BrowserRouter>
  )
}
