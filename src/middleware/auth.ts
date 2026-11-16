import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

declare global {
  namespace Express {
    interface Request {
      userId?: number
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' })
  }

  try {
    const payload = jwt.verify(
      header.slice(7),
      process.env.JWT_SECRET as string
    ) as { userId?: number; id?: number }

    const id = payload.userId ?? payload.id
    if (!id) return res.status(401).json({ error: 'Invalid token' })

    req.userId = id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}