import React, { useState } from 'react'
import api from '../api'

export default function Login() {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState(null)

  const submit = async (e) => {
    e.preventDefault()
    try {
      const res = await api.login(username)
      // store token (demo)
      if (res.token) localStorage.setItem('token', res.token)
      setMessage('Logged in (demo). Token stored in localStorage.')
    } catch (err) {
      setMessage('Login failed: ' + err.message)
    }
  }

  return (
    <div>
      <h2>Login (demo)</h2>
      <form onSubmit={submit}>
        <label>
          Username:
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <button type="submit">Login</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  )
}
