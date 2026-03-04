import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './WorkerDashboard.css'

export default function WorkerDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('requests')
  const userData = localStorage.getItem('currentUser')
  let currentUser = null
  try {
    currentUser = userData ? JSON.parse(userData) : null
  } catch (error) {
    currentUser = null
  }
  const displayName = currentUser?.fullName || 'Worker'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('currentUser')
    localStorage.removeItem('userRole')
    navigate('/login')
  }

  // Demo data for new job requests
  const jobRequests = [
    {
      id: 1,
      service: 'Laundry Service',
      homeowner: 'Brian M.',
      date: 'Tomorrow',
      time: '2:00 PM',
      status: 'Pending',
      image: '👨‍💼'
    },
    {
      id: 2,
      service: 'House Cleaning',
      homeowner: 'Sarah K.',
      date: 'March 6',
      time: '9:00 AM',
      status: 'Pending',
      image: '👩‍💼'
    }
  ]

  const activeJobs = [
    {
      id: 1,
      service: 'Cleaning Service',
      homeowner: 'John D.',
      date: 'Today',
      time: '4:00 PM',
      status: 'In Progress',
      image: '👨‍💼'
    },
    {
      id: 2,
      service: 'Laundry & Ironing',
      homeowner: 'Emma W.',
      date: 'March 5',
      time: '10:00 AM',
      status: 'Scheduled',
      image: '👩‍💼'
    }
  ]

  const handleAcceptJob = (jobId) => {
    alert(`Job ${jobId} accepted!`)
  }

  return (
    <div className="worker-dashboard-container">
      {/* Header with navigation */}
      <header className="worker-dashboard-header">
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Job Requests
          </button>
          <button 
            className={`nav-tab ${activeTab === 'jobs' ? 'active' : ''}`}
            onClick={() => setActiveTab('jobs')}
          >
            Your Jobs
          </button>
        </div>
        <button className="btn-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Main content */}
      <main className="worker-dashboard-main">
        {activeTab === 'requests' ? (
          <>
            {/* Welcome section */}
            <div className="welcome-section">
              <h1 className="welcome-title">Welcome back, {displayName}!</h1>
              <p className="welcome-subtitle">What is on your agenda today?</p>
            </div>

            {/* Action cards */}
            <section className="actions-section">
              <div className="action-card new-requests">
                <div className="action-icon">📅</div>
                <h3>New Job Requests</h3>
                <p>View & accept appointments</p>
              </div>
              <div className="action-card active-jobs" onClick={() => setActiveTab('jobs')}>
                <div className="action-icon">✅</div>
                <h3>Your Jobs</h3>
                <p>Manage your active jobs</p>
              </div>
            </section>

            {/* Job Requests */}
            {jobRequests.length > 0 && (
              <section className="job-requests-section">
                <h2 className="section-title">📋 New Job Request</h2>
                <div className="jobs-list">
                  {jobRequests.map((job) => (
                    <div key={job.id} className="job-card">
                      <div className="job-image">{job.image}</div>
                      <div className="job-info">
                        <h3 className="job-service">
                          {job.service} <span className="job-homeowner">for {job.homeowner}</span>
                        </h3>
                        <p className="job-datetime">{job.date}, {job.time}</p>
                        <p className={`job-status status-${job.status.toLowerCase().replace(' ', '-')}`}>
                          Status: {job.status}
                        </p>
                      </div>
                      <button className="btn-accept" onClick={() => handleAcceptJob(job.id)}>
                        Accept
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <>
            {/* Your Jobs tab */}
            <div className="welcome-section">
              <h1 className="welcome-title">Your Jobs</h1>
              <p className="welcome-subtitle">Track all your active jobs</p>
            </div>

            <section className="active-jobs-section">
              <div className="jobs-list">
                {activeJobs.map((job) => (
                  <div key={job.id} className="job-card">
                    <div className="job-image">{job.image}</div>
                    <div className="job-info">
                      <h3 className="job-service">
                        {job.service} <span className="job-homeowner">for {job.homeowner}</span>
                      </h3>
                      <p className="job-datetime">{job.date}, {job.time}</p>
                      <p className={`job-status status-${job.status.toLowerCase().replace(' ', '-')}`}>
                        Status: {job.status}
                      </p>
                    </div>
                    <div className="job-actions">
                      <button className="btn-complete">Complete</button>
                      <button className="btn-reschedule">Reschedule</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
