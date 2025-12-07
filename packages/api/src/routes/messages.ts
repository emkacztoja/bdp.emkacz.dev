import { Router } from 'express'
import prisma from '../prisma-client'
import { Queue } from 'bullmq'
import Redis from 'ioredis'
import auth from '../middleware/auth'

const router = Router()

const redisUrl = process.env.REDIS_URL || 'redis://redis:6379'
const redis = new Redis(redisUrl)
const queue = new Queue('messages', { connection: redis } as any)

// POST / - enqueue a message to be sent by a bot
router.post('/', auth, async (req, res) => {
  const body = req.body as any
  const botId = typeof body.botId === 'string' ? body.botId : ''
  const channelId = typeof body.channelId === 'string' ? body.channelId : ''
  const content = typeof body.content === 'string' ? body.content : ''
  const guildId = typeof body.guildId === 'string' ? body.guildId : undefined

  if (!botId) return res.status(400).json({ message: 'botId is required' })
  if (!channelId) return res.status(400).json({ message: 'channelId is required' })
  if (!content) return res.status(400).json({ message: 'content is required' })

  // load bot and authorize
  const bot = await prisma.bot.findUnique({ where: { id: botId } })
  if (!bot) return res.status(404).json({ message: 'bot not found' })
  if (req.user?.role !== 'ADMIN' && bot.ownerId !== req.user!.id) return res.status(403).json({ message: 'forbidden' })

  try {
    const msg = await prisma.messageLog.create({ data: { botId, guildId, channelId, content } })
    // enqueue job with messageLog id
    await queue.add('send', { messageLogId: msg.id }, { attempts: 5, backoff: { type: 'exponential', delay: 1000 } })
    await prisma.auditLog.create({ data: { actorId: req.user!.id, botId: bot.id, action: 'MESSAGE_ENQUEUED', detail: { messageLogId: msg.id } } })
    res.json({ id: msg.id, status: msg.status })
  } catch (e: any) {
    console.error('failed to enqueue message', e?.message || e)
    res.status(500).json({ message: 'failed to enqueue message' })
  }
})

export default router
