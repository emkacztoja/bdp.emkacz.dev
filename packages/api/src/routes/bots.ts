import { Router } from 'express'
import prisma from '../prisma-client'
import { encryptToken } from '../lib/crypto'
import auth from '../middleware/auth'

const router = Router()

// Create bot: encrypt token and save
router.post('/', auth, async (req, res) => {
  const body = req.body as any
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const token = typeof body.token === 'string' ? body.token.trim() : ''

  if (!name) return res.status(400).json({ message: 'name is required' })
  if (!token) return res.status(400).json({ message: 'token is required' })

  // Ensure encryption key exists early so we return a clear error instead of a stack trace
  if (!process.env.ENCRYPTION_KEY) {
    console.error('ENCRYPTION_KEY missing in environment')
    return res.status(500).json({ message: 'server misconfiguration: ENCRYPTION_KEY missing' })
  }

  try {
    const encrypted = encryptToken(token, process.env.ENCRYPTION_KEY)
    const bot = await prisma.bot.create({ data: { name, tokenEncrypted: encrypted, tokenNonce: '', ownerId: req.user!.id } })
    await prisma.auditLog.create({ data: { actorId: req.user!.id, botId: bot.id, action: 'BOT_CREATED', detail: { name: bot.name } } })
    res.json({ id: bot.id, name: bot.name, ownerId: bot.ownerId, active: bot.active, createdAt: bot.createdAt })
  } catch (e: any) {
    console.error('failed to create bot', e?.message || e)
    // If the error is from encryption helper, surface a helpful message
    if (e?.message?.includes('ENCRYPTION_KEY')) {
      return res.status(500).json({ message: 'server misconfiguration: invalid ENCRYPTION_KEY' })
    }
    res.status(500).json({ message: 'failed to create bot' })
  }
})

// List bots for current user (admins get all)
router.get('/', auth, async (req, res) => {
  const isAdmin = req.user?.role === 'ADMIN'
  const bots = isAdmin ? await prisma.bot.findMany() : await prisma.bot.findMany({ where: { ownerId: req.user!.id } })
  // mask token
  const out = bots.map((b) => ({ id: b.id, name: b.name, active: b.active, ownerId: b.ownerId, lastConnectedAt: b.lastConnectedAt }))
  res.json(out)
})

// Get single bot (no token)
router.get('/:id', auth, async (req, res) => {
  const { id } = req.params
  if (!id) return res.status(400).json({ message: 'id required' })
  const bot = await prisma.bot.findUnique({ where: { id } })
  if (!bot) return res.status(404).json({ message: 'bot not found' })
  // authorize: admin or owner
  if (req.user?.role !== 'ADMIN' && bot.ownerId !== req.user!.id) return res.status(403).json({ message: 'forbidden' })
  res.json({ id: bot.id, name: bot.name, active: bot.active, ownerId: bot.ownerId, lastConnectedAt: bot.lastConnectedAt, createdAt: bot.createdAt })
})

// Delete bot (DB) - worker should handle disconnect separately
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params
  if (!id) return res.status(400).json({ message: 'id required' })
  const bot = await prisma.bot.findUnique({ where: { id } })
  if (!bot) return res.status(404).json({ message: 'bot not found' })
  // authorize: admin or owner
  if (req.user?.role !== 'ADMIN' && bot.ownerId !== req.user!.id) return res.status(403).json({ message: 'forbidden' })
  try {
    await prisma.auditLog.create({ data: { actorId: req.user!.id, botId: bot.id, action: 'BOT_DELETED', detail: { name: bot.name } } })
    await prisma.bot.delete({ where: { id: bot.id } })
    // NOTE: worker should be notified (e.g., via Redis) to disconnect the bot; omitted here for brevity
    res.json({ ok: true })
  } catch (e: any) {
    console.error('failed to delete bot', e?.message || e)
    res.status(500).json({ message: 'failed to delete bot' })
  }
})

export default router
