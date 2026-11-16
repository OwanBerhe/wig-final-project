import { Router } from 'express'
import { db } from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

function concertQuery() {
  return db
    .selectFrom('concert')
    .innerJoin('venue', 'venue.venue_id', 'concert.venue_id')
    .select([
      'concert.concert_id',
      'concert.venue_id',
      'concert.title',
      'concert.date',
      'concert.ticket_price',
      'venue.name as venue_name',
    ])
}

router.get('/', async (_req, res) => {
  const concerts = await concertQuery().orderBy('concert.date', 'asc').execute()
  res.json(concerts)
})

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id)

  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid concert id' })
    return
  }

  const concert = await concertQuery()
    .where('concert.concert_id', '=', id)
    .executeTakeFirst()

  if (!concert) {
    res.status(404).json({ error: 'Concert not found' })
    return
  }

  res.json(concert)
})

router.post('/', requireAuth, async (req, res) => {
  const venue_id = Number(req.body?.venue_id)
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const date = new Date(req.body?.date)
  const ticket_price =
    req.body?.ticket_price === undefined || req.body?.ticket_price === ''
      ? 0
      : Number(req.body.ticket_price)

  if (!Number.isInteger(venue_id) || venue_id < 1) {
    res.status(400).json({ error: 'venue_id must be a positive whole number' })
    return
  }
  if (!title || title.length > 150) {
    res.status(400).json({ error: 'title is required and must be 150 characters or fewer' })
    return
  }
  if (!req.body?.date || Number.isNaN(date.getTime())) {
    res.status(400).json({ error: 'date is required and must be a valid date' })
    return
  }
  if (!Number.isFinite(ticket_price) || ticket_price < 0) {
    res.status(400).json({ error: 'ticket_price must be a number that is 0 or more' })
    return
  }

  const venue = await db
    .selectFrom('venue')
    .select(['venue_id', 'owner_id'])
    .where('venue_id', '=', venue_id)
    .executeTakeFirst()

  if (!venue) {
    res.status(404).json({ error: 'Venue not found' })
    return
  }
  if (venue.owner_id !== req.user_id) {
    res.status(403).json({ error: 'You do not own this venue' })
    return
  }

  const concert = await db
    .insertInto('concert')
    .values({ venue_id, title, date, ticket_price })
    .returning(['concert_id', 'venue_id', 'title', 'date', 'ticket_price'])
    .executeTakeFirstOrThrow()

  res.status(201).json(concert)
})

export default router