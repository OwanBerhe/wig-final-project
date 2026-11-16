import { Router } from 'express'
import { db } from '../db'

// Kept separate from the main concerts router so we don't edit the same file.
// Mount alongside it: api.use('/concerts', concertsDetailRouter)
const router = Router()

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid concert id' })
    return
  }

  try {
    const concert = await db
      .selectFrom('concert')
      .innerJoin('venue', 'venue.venue_id', 'concert.venue_id')
      .select([
        'concert.concert_id',
        'concert.title',
        'concert.date',
        'concert.ticket_price',
        'venue.venue_id',
        'venue.name as venue_name',
        'venue.city as venue_city',
      ])
      .where('concert.concert_id', '=', id)
      .executeTakeFirst()

    if (!concert) {
      res.status(404).json({ error: 'Concert not found' })
      return
    }

    const artists = await db
      .selectFrom('concert_artist')
      .innerJoin('artist', 'artist.artist_id', 'concert_artist.artist_id')
      .select(['artist.artist_id', 'artist.name'])
      .where('concert_artist.concert_id', '=', id)
      .execute()

    res.json({ ...concert, artists })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch concert' })
  }
})

// Read-only live chat for a concert, oldest first
router.get('/:id/messages', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: 'Invalid concert id' })
    return
  }

  try {
    const messages = await db
      .selectFrom('live_chat_message')
      .innerJoin('users', 'users.user_id', 'live_chat_message.user_id')
      .select([
        'live_chat_message.message_id',
        'live_chat_message.body',
        'live_chat_message.sent_at',
        'users.username',
      ])
      .where('live_chat_message.concert_id', '=', id)
      .orderBy('live_chat_message.sent_at')
      .execute()
    res.json(messages)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

export default router
