import React, { useEffect, useState } from 'react'
import api from './api'

export default function App() {
  const [msg, setMsg] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.getHello()
      .then((r) => setMsg(r.message))
      .catch((e) => setError(e.message))
  }, [])

  return (
    <div className="app">
      <h1>Nyumba Freshi</h1>
      <p>React frontend scaffold</p>
      <div>
        <strong>Backend:</strong>{' '}
        {msg ? <span>{msg}</span> : error ? <span style={{ color: 'red' }}>{error}</span> : <em>loading…</em>}
      </div>
    </div>
  )
}
