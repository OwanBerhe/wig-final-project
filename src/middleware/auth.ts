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
import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

// Returns the user id inside a valid token, or null. Shared by the HTTP
// middleware below and the WebSocket server (which can't send headers).
export function verifyToken(token: string): number | null {
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      userId?: number
      id?: number
    }
    return payload.userId ?? payload.id ?? null
  } catch {
    return null
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  const id = verifyToken(header.slice(7))
  if (!id) return res.status(401).json({ error: 'Invalid or expired token' })

  req.userId = id
  next()
}
