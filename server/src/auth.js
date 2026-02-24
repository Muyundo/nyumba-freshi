const jwt = require('jsonwebtoken')

const secret = process.env.JWT_SECRET || 'dev-secret'
const expiresIn = process.env.JWT_EXPIRES_IN || '1h'

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET is not set. Using development secret. Set JWT_SECRET in server/.env for production.')
}

function signToken(payload) {
  return jwt.sign(payload, secret, { expiresIn })
}

function verifyTokenMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    const decoded = jwt.verify(token, secret)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

module.exports = { signToken, verifyTokenMiddleware }
