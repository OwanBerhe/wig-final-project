import { Router } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const users = await db.selectFrom('users').selectAll().execute()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const user = await db
      .insertInto('users')
      .values(req.body)
      .returningAll()
      .executeTakeFirstOrThrow()
    res.status(201).json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router
