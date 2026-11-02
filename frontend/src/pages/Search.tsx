import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Result = {
  concert_id: number
  title: string
  date: string
  venue_name: string
  venue_city: string
}

export default function Search() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Result[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    api<Result[]>(`/search?q=${encodeURIComponent(q)}`)
      .then(setResults)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }

  return (
    <div>
      <h1>Search</h1>
      <form onSubmit={onSubmit}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Concert, venue or artist"
        />
        <button type="submit" disabled={loading}>
          Search
        </button>
      </form>

      {loading && <p>Searching...</p>}
      {error && <p className="error">Error: {error}</p>}
      {!loading && results?.length === 0 && <p>No results.</p>}
      {results?.map((r) => (
        <div className="card" key={r.concert_id}>
          <h2>
            <Link to={`/items/${r.concert_id}`}>{r.title}</Link>
          </h2>
          <p>
            {new Date(r.date).toLocaleString()} · {r.venue_name}, {r.venue_city}
          </p>
        </div>
      ))}
    </div>
  )
}
