import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import helmet from 'helmet'
import config from './config'

const app = express()
app.set('trust proxy', 1)
app.use(helmet())
app.use(express.json())
app.use(cookieParser())
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }))

import authRouter from './routes/auth'
import botsRouter from './routes/bots'
import messagesRouter from './routes/messages'
import usersRouter from './routes/users'
import prisma from './prisma-client'

app.get('/api/health', (req, res) => res.json({ ok: true }))

// readiness: ensure DB connection
app.get('/api/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ ok: false })
  }
})

app.use('/api/auth', authRouter)
app.use('/api/bots', botsRouter)
app.use('/api/messages', messagesRouter)
app.use('/api/users', usersRouter)

// global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error', err?.stack || err)
  res.status(500).json({ message: 'internal server error' })
})

export default app
