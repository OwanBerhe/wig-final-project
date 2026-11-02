import { Router } from 'express'
import { db } from '../db'

const router = Router()

// GET /search?q=... — case-insensitive match on concert title, venue name and
// artist name. Full-text indexing and PostGIS come later.
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!q) {
    res.json([])
    return
  }

  // Escape LIKE wildcards so a user's % or _ is matched literally
  const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`

  try {
    const results = await db
      .selectFrom('concert')
      .innerJoin('venue', 'venue.venue_id', 'concert.venue_id')
      .select([
        'concert.concert_id',
        'concert.title',
        'concert.date',
        'concert.ticket_price',
        'venue.name as venue_name',
        'venue.city as venue_city',
      ])
      .where((eb) =>
        eb.or([
          eb('concert.title', 'ilike', pattern),
          eb('venue.name', 'ilike', pattern),
          eb.exists(
            eb
              .selectFrom('concert_artist')
              .innerJoin('artist', 'artist.artist_id', 'concert_artist.artist_id')
              .select('concert_artist.concert_id')
              .whereRef('concert_artist.concert_id', '=', 'concert.concert_id')
              .where('artist.name', 'ilike', pattern)
          ),
        ])
      )
      .orderBy('concert.date')
      .limit(50)
      .execute()
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Search failed' })
  }
})

export default router
