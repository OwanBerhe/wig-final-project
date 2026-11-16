import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { db } from '../db'

const router = Router()

router.get('/', async (_req, res) => {
  try {
    const users = await db
      .selectFrom('users')
      .select(['user_id', 'username', 'role', 'location'])
      .execute()
    res.json(users)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { email, username, role, location, password } = req.body ?? {}
    if (!email || !username || !role || !password) {
      return res
        .status(400)
        .json({ error: 'email, username, role, and password are required' })
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await db
      .insertInto('users')
      .values({ email, username, role, location, password_hash })
      .returning(['user_id', 'email', 'username', 'role', 'location'])
      .executeTakeFirstOrThrow()
    res.status(201).json(user)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create user' })
  }
})

export default router