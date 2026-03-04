import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">

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
                  <DashboardRouter />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
