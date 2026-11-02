import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import cors from 'cors'
// import listingsRouter from './routes/listings'

const app = express()
const PORT = Number(process.env.PORT) || 3000

app.use(cors())
app.use(express.json())

// Everything the frontend calls lives under /api
const api = express.Router()
api.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
// api.use('/listings', listingsRouter)
app.use('/api', api)

// Catch-all error handler: always returns JSON
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: err.message || 'Server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})