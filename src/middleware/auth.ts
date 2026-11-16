import 'dotenv/config'
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const secret = process.env.JWT_SECRET

if (!secret) {
  throw new Error('JWT_SECRET is not set. Add it to your .env file.')
}

declare global {
  namespace Express {
    interface Request {
      user_id?: number
    }
  }
}

export function signToken(user_id: number): string {
  return jwt.sign({ user_id }, secret as string, { expiresIn: '7d' })
}

// Returns the user id inside a valid token, or null. Shared by the HTTP
// middleware below and the WebSocket server (which can't send headers).
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, secret as string) as { user_id?: unknown }
    return typeof payload.user_id === 'number' ? payload.user_id : null
  } catch {
    return null
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }

  const user_id = verifyToken(header.slice(7))
  if (!user_id) {
    res.status(401).json({ error: 'Invalid or expired token' })
    return
  }

  req.user_id = user_id
  next()
}