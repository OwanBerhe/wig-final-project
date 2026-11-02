import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'

type Item = {
  id: number
  title: string
  description: string | null
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<Item[]>('/listings')
      .then(setItems)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p>Loading...</p>
  if (error) return <p className="error">Error: {error}</p>
  if (items.length === 0) return <p>Nothing here yet.</p>

  return (
    <div>
      <h1>Home</h1>
      {items.map((item) => (
        <div className="card" key={item.id}>
          <h2>
            <Link to={`/items/${item.id}`}>{item.title}</Link>
          </h2>
          <p>{item.description}</p>
        </div>
      ))}
    </div>
  )
}