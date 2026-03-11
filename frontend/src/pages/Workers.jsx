import React, { useEffect, useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import api from '../api'
import Header from '../components/Header'
import './Workers.css'

const ESTATES_BY_LOCATION = {
  Kitengela: ['Chuna', 'Milimani', 'Acacia'],
  Mlolongo: ['Greenville', 'Waybridge Gardens', 'Valley View Park'],
}

const HOMEOWNER_LOCATIONS = Object.keys(ESTATES_BY_LOCATION)

function normalizeServiceKey(service) {
  const value = String(service || '').toLowerCase().trim()
  if (value.includes('clean')) return 'cleaning'
  if (value.includes('laundry')) return 'laundry'
  return value
}

function getReadableServiceFilter(service) {
  if (service === 'cleaning') return 'House Cleaning'
  if (service === 'laundry') return 'Laundry'
  if (service === 'both') return 'Cleaning + Laundry'
  return service
}

function getWorkerInitials(fullName) {
  return fullName
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Workers() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const rawService = searchParams.get('service') || 'all'
  const serviceFilter = normalizeServiceKey(rawService)
  const rawLocation = searchParams.get('location') || 'all'
  const locationFilter = HOMEOWNER_LOCATIONS.includes(rawLocation) ? rawLocation : 'all'
  const rawEstate = searchParams.get('estate') || 'all'
  const isKnownEstate = locationFilter !== 'all' && (ESTATES_BY_LOCATION[locationFilter] || []).includes(rawEstate)
  const estateFilter = isKnownEstate ? rawEstate : 'all'
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [favorites, setFavorites] = useState(new Set())

  const updateFilters = ({
    service = serviceFilter,
    location = locationFilter,
    estate = estateFilter,
  }) => {
    const nextParams = {}
    if (service !== 'all') nextParams.service = service
    if (location !== 'all') nextParams.location = location
    if (location !== 'all' && estate !== 'all') nextParams.estate = estate
    setSearchParams(nextParams)
  }

  const handleFilterChange = (event) => {
    const nextFilter = event.target.value
    updateFilters({ service: nextFilter })
  }

  const handleLocationChange = (event) => {
    const nextLocation = event.target.value
    updateFilters({ location: nextLocation, estate: 'all' })
  }

  const handleEstateChange = (event) => {
    const nextEstate = event.target.value
    updateFilters({ estate: nextEstate })
  }

  const toggleFavorite = (workerId) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev)
      if (newFavorites.has(workerId)) {
        newFavorites.delete(workerId)
      } else {
        newFavorites.add(workerId)
      }
      return newFavorites
    })
  }

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true)
        setError(null)
        const workers = await api.getWorkers()
        
        // Filter by service if provided
        let filteredWorkers = workers
        if (serviceFilter !== 'all') {
          const normalizedFilter = normalizeServiceKey(serviceFilter)
          filteredWorkers = workers.filter((w) => {
            const workerServices = (w.services || []).map((item) => normalizeServiceKey(item))

            if (normalizedFilter === 'both') {
              return workerServices.includes('cleaning') && workerServices.includes('laundry')
            }

            return workerServices.includes(normalizedFilter)
          })
        }

        if (locationFilter !== 'all') {
          const normalizedLocationFilter = String(locationFilter).toLowerCase().trim()
          filteredWorkers = filteredWorkers.filter((w) =>
            String(w.location || '').toLowerCase().trim() === normalizedLocationFilter
          )
        }

        if (estateFilter !== 'all') {
          const normalizedEstateFilter = String(estateFilter).toLowerCase().trim()
          filteredWorkers = filteredWorkers.filter((w) =>
            String(w.estate || '').toLowerCase().trim() === normalizedEstateFilter
          )
        }
        
        setList(filteredWorkers)
      } catch (err) {
        console.error('Failed to fetch workers:', err)
        setError('Failed to load workers. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchWorkers()
  }, [serviceFilter, locationFilter, estateFilter])

  return (
    <div className="workers-page">
      <Header />
      
      <div className="workers-container">
        <div className="workers-header">
          <h1>Workers</h1>
          <p>Browse and hire trusted professionals.</p>
        </div>

        <div className="workers-filter-section">
          <label className="workers-filter-label" htmlFor="serviceFilter">
            Filter by service:
          </label>
          <select
            id="serviceFilter"
            className="workers-filter-select"
            value={serviceFilter}
            onChange={handleFilterChange}
          >
            <option value="all">All Services</option>
            <option value="cleaning">House Cleaning</option>
            <option value="laundry">Laundry</option>
            <option value="both">Cleaning + Laundry</option>
          </select>

          <label className="workers-filter-label" htmlFor="locationFilter">
            Filter by location:
          </label>
          <select
            id="locationFilter"
            className="workers-filter-select"
            value={locationFilter}
            onChange={handleLocationChange}
          >
            <option value="all">All Locations</option>
            {HOMEOWNER_LOCATIONS.map((locationOption) => (
              <option key={locationOption} value={locationOption}>
                {locationOption}
              </option>
            ))}
          </select>

          <label className="workers-filter-label" htmlFor="estateFilter">
            Filter by estate:
          </label>
          <select
            id="estateFilter"
            className="workers-filter-select"
            value={estateFilter}
            onChange={handleEstateChange}
            disabled={locationFilter === 'all'}
          >
            <option value="all">All Estates</option>
            {(ESTATES_BY_LOCATION[locationFilter] || []).map((estateOption) => (
              <option key={estateOption} value={estateOption}>
                {estateOption}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="loading-message">Loading workers...</p>}
        {error && <p className="error-message">{error}</p>}
        
        {!loading && list.length === 0 && (
          <p className="empty-message">
            {serviceFilter !== 'all' || locationFilter !== 'all' || estateFilter !== 'all'
              ? 'No workers found for the selected filters.'
              : 'No workers available.'}
          </p>
        )}
        
        {!loading && list.length > 0 && (
          <div className="workers-grid">
            {list.map((w) => (
              <div key={w.id} className="worker-card">
                <div className="worker-card-header">
                  <div className="worker-avatar">{getWorkerInitials(w.fullName)}</div>
                  <button
                    className={`favorite-btn ${favorites.has(w.id) ? 'active' : ''}`}
                    onClick={() => toggleFavorite(w.id)}
                    aria-label="Add to favorites"
                  >
                    ♡
                  </button>
                </div>

                <div className="worker-card-content">
                  <Link to={`/workers/${w.id}`} className="worker-name">
                    {w.fullName}
                  </Link>

                  <div className="worker-location">
                    {[w.location, w.estate].filter(Boolean).join(' · ') || 'Location not specified'}
                  </div>
                  
                  <div className="worker-services">
                    {w.services && w.services.length > 0 
                      ? w.services.join(', ') 
                      : 'No services listed'}
                  </div>

                  <div className="worker-rating">
                    <span className="stars">★★★★★</span>
                    <span className="rating-text">
                      {w.rating || 'No reviews yet'}
                    </span>
                  </div>
                </div>

                <div className="worker-card-footer">
                  <Link to={`/booking/${w.id}`} className="book-now-btn">
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
