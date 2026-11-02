import { Router } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const artists = await db.selectFrom('artist').selectAll().execute()
    res.json(artists)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch artists' })
  }
})

router.post('/', async (req, res) => {
  const { user_id, name, bio } = req.body ?? {}
  if (!user_id || !name) {
    res.status(400).json({ error: 'user_id and name are required' })
    return
  }

  try {
    const artist = await db
      .insertInto('artist')
      .values({ user_id, name, bio })
      .returningAll()
      .executeTakeFirstOrThrow()
    res.status(201).json(artist)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create artist' })
  }
})

export default router
