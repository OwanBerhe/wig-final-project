import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { db } from '../db'
import { signToken } from '../middleware/auth'
import type { UserRole } from '../types/db'

const router = Router()

const ROLES: UserRole[] = ['concert_goer', 'artist', 'venue_owner']
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = text(req.body?.email).toLowerCase()
    const username = text(req.body?.username)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const role = req.body?.role as UserRole
    const location = text(req.body?.location) || null

    if (!email || !username || !password || !role) {
      res.status(400).json({ error: 'email, username, password and role are required' })
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      res.status(400).json({ error: 'Email is not valid' })
      return
    }
    if (username.length > 50) {
      res.status(400).json({ error: 'Username must be 50 characters or fewer' })
      return
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' })
      return
    }
    if (!ROLES.includes(role)) {
      res.status(400).json({ error: `role must be one of: ${ROLES.join(', ')}` })
      return
    }

    const password_hash = await bcrypt.hash(password, 10)

    const user = await db
      .insertInto('users')
      .values({ email, username, role, location, password_hash })
      .returning(['user_id', 'email', 'username', 'role', 'location'])
      .executeTakeFirstOrThrow()

    res.status(201).json(user)
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      res.status(409).json({ error: 'Email or username is already taken' })
      return
    }
    next(err)
  }
})

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const email = text(req.body?.email).toLowerCase()
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' })
      return
    }

    const user = await db
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst()

    const ok = user ? await bcrypt.compare(password, user.password_hash) : false
    if (!user || !ok) {
      res.status(401).json({ error: 'Invalid email or password' })
      return
    }

    res.json({
      token: signToken(user.user_id),
      user: {
        user_id: user.user_id,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    })
  } catch (err) {
    next(err)
  }
})

export default router