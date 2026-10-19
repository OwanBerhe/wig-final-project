import 'dotenv/config'
import express from 'express'
import usersRouter from './routes/users'

const app = express()
const port = Number(process.env.PORT) || 3000

app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/users', usersRouter)

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`)
})
