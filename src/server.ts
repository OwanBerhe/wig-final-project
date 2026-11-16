import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
// import listingsRouter from './routes/listings'
import artistsRouter from './routes/artists'
import venuesRouter from './routes/venues'
import usersRouter from './routes/users'
import searchRouter from './routes/search'
import concertsRouter from './routes/concerts'
import concertsDetailRouter from './routes/concerts-detail'

import authRouter from './routes/auth'
import conversationsRouter from './routes/conversations'
import { attachRealtime } from './realtime'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())

// Everything the frontend calls lives under /api
const api = express.Router()
api.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
api.use('/auth', authRouter)
api.use('/concerts', concertsDetailRouter)
api.use('/concerts', concertsRouter)
api.use('/artists', artistsRouter)
api.use('/venues', venuesRouter)
api.use('/users', usersRouter)
api.use('/search', searchRouter)
api.use('/conversations', conversationsRouter)
app.use('/api', api)

// Catch-all error handler: always returns JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

// Live chat: WebSocket server at ws://localhost:PORT/ws
attachRealtime(server)