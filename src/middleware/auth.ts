import 'dotenv/config'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import type { UserRole } from '../types/db'

const secret = process.env.JWT_SECRET

if (!secret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file.')
}

export interface AuthUser {
  user_id: number
  role: UserRole
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser
  }
}

export function signToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, secret as string, {
    subject: String(user.user_id),
    expiresIn: '7d',
  })
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  try {
    const payload = jwt.verify(header.slice(7), secret as string)

    if (typeof payload === 'string' || !payload.sub) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    req.user = {
      user_id: Number(payload.sub),
      role: payload.role as UserRole,
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}