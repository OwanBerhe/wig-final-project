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
