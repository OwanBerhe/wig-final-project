import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'

type Concert = {
  concert_id: number
  title: string
  date: string
  ticket_price: string
  venue_name: string
  venue_city: string
  artists: { artist_id: number; name: string }[]
}

type Message = {
  message_id: number
  body: string
  sent_at: string
  username: string
}

export default function Detail() {
  const { id } = useParams()
  // Tagged with the id it was loaded for, so changing the URL shows Loading again
  const [result, setResult] = useState<{
    id?: string
    concert?: Concert
    messages?: Message[]
    error?: string
  }>({})

  useEffect(() => {
    Promise.all([
      api<Concert>(`/concerts/${id}`),
      api<Message[]>(`/concerts/${id}/messages`),
    ])
      .then(([concert, messages]) => setResult({ id, concert, messages }))
      .catch((e: Error) => setResult({ id, error: e.message }))
  }, [id])

  if (result.id !== id) return <p>Loading...</p>
  if (result.error) return <p className="error">Error: {result.error}</p>
  const { concert, messages = [] } = result
  if (!concert) return null

  return (
    <div>
      <h1>{concert.title}</h1>
      <div className="card">
        <p>
          <strong>When:</strong> {new Date(concert.date).toLocaleString()}
        </p>
        <p>
          <strong>Where:</strong> {concert.venue_name}, {concert.venue_city}
        </p>
        <p>
          <strong>Tickets:</strong> ${concert.ticket_price}
        </p>
        <p>
          <strong>Artists:</strong>{' '}
          {concert.artists.length
            ? concert.artists.map((a) => a.name).join(', ')
            : 'TBA'}
        </p>
      </div>

      <h2>Live chat</h2>
      {messages.length === 0 ? (
        <p>No messages yet.</p>
      ) : (
        <div className="card">
          {messages.map((m) => (
            <p key={m.message_id}>
              <strong>{m.username}</strong>{' '}
              <small>{new Date(m.sent_at).toLocaleTimeString()}</small>
              <br />
              {m.body}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
