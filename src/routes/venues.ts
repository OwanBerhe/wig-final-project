import { Router } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const venues = await db.selectFrom('venue').selectAll().execute()
    res.json(venues)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch venues' })
  }
})

router.post('/', async (req, res) => {
  const { owner_id, name, address, city, open_to_talent, latitude, longitude } =
    req.body ?? {}
  if (!owner_id || !name || !address || !city) {
    res.status(400).json({ error: 'owner_id, name, address and city are required' })
    return
  }

  try {
    const venue = await db
      .insertInto('venue')
      .values({ owner_id, name, address, city, open_to_talent, latitude, longitude })
      .returningAll()
      .executeTakeFirstOrThrow()
    res.status(201).json(venue)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create venue' })
  }
})

export default router
