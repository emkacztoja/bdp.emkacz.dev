import 'dotenv/config'
import { Worker } from 'bullmq'
import IORedis from 'ioredis'
import { Client, GatewayIntentBits, TextChannel, User } from 'discord.js'
import prisma from './prisma-client'
import { decryptToken } from './crypto'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
const connection = new IORedis(redisUrl)

const worker = new Worker('messages', async (job) => {
  console.log('Processing job', job.id, job.name, job.data)
  const { messageLogId } = job.data as { messageLogId: string }
  const msg = await prisma.messageLog.findUnique({ where: { id: messageLogId } })
  if (!msg) throw new Error('MessageLog not found')
  const bot = await prisma.bot.findUnique({ where: { id: msg.botId } })
  if (!bot) throw new Error('Bot not found')

  // decrypt token
  let token: string
  try {
    token = decryptToken(bot.tokenEncrypted, process.env.ENCRYPTION_KEY)
  } catch (e: any) {
    console.error('failed to decrypt token for bot', bot.id, e?.message || e)
    await prisma.messageLog.update({ where: { id: msg.id }, data: { status: 'FAILED', error: 'failed to decrypt token' } })
    return
  }

  // simple in-memory client cache
  // @ts-ignore global cache
  if (!globalThis.__bdp_client_cache) (globalThis as any).__bdp_client_cache = new Map<string, Client>()
  const clientCache: Map<string, Client> = (globalThis as any).__bdp_client_cache

  let client = clientCache.get(bot.id)
  if (!client) {
    client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.DirectMessages, GatewayIntentBits.MessageContent] })
    client.once('ready', () => {
      console.log(`Client ready for bot ${bot.id} as ${client?.user?.tag}`)
      prisma.bot.update({ where: { id: bot.id }, data: { lastConnectedAt: new Date() } }).catch(() => {})
    })
    client.on('error', (err) => console.error('discord client error', err))
    try {
      await client.login(token)
      clientCache.set(bot.id, client)
    } catch (e: any) {
      console.error('failed to login discord client', e?.message || e)
      await prisma.messageLog.update({ where: { id: msg.id }, data: { status: 'FAILED', error: 'failed to login bot token' } })
      return
    }
  }

  try {
    // Try send message to channel or user
    if (msg.channelId && msg.guildId) {
      // guild channel
      const channel = await client.channels.fetch(msg.channelId)
      if (!channel || !(channel as any).isTextBased || !(channel as TextChannel)) {
        throw new Error('channel not found or not text channel')
      }
      // @ts-ignore send exists
      await (channel as any).send(msg.content)
    } else if (msg.channelId) {
      // maybe a DM channel id (fallback)
      // try to fetch user by id and send DM
      let user: User | null = null
      try {
        user = await client.users.fetch(msg.channelId)
      } catch (e) {
        // ignore
      }
      if (user) {
        await user.send(msg.content)
      } else {
        const channel = await client.channels.fetch(msg.channelId)
        if (!channel) throw new Error('channel not found')
        // @ts-ignore
        await (channel as any).send(msg.content)
      }
    } else {
      throw new Error('no channelId provided')
    }

    await prisma.messageLog.update({ where: { id: msg.id }, data: { status: 'SENT', attempts: msg.attempts + 1 } })
    await prisma.auditLog.create({ data: { actorId: null, botId: bot.id, action: 'MESSAGE_SENT', detail: { messageLogId: msg.id } } })
    console.log('message sent', msg.id)
  } catch (e: any) {
    console.error('failed to send message', e?.message || e)
    await prisma.messageLog.update({ where: { id: msg.id }, data: { status: 'FAILED', error: String(e?.message || e), attempts: msg.attempts + 1 } })
    throw e
  }
}, { connection: { host: '127.0.0.1', port: 6379 } as any })

worker.on('completed', (job) => console.log('Job completed', job.id))
worker.on('failed', (job, err) => console.error('Job failed', job?.id, err))

console.log('Worker started')

async function shutdown(signal?: string) {
  console.log('Worker shutting down', signal || '')
  try {
    // disconnect all discord clients
    // @ts-ignore
    if (globalThis.__bdp_client_cache) {
      // @ts-ignore
      for (const c of (globalThis as any).__bdp_client_cache.values()) {
        try { await c.destroy() } catch (e) { /* ignore */ }
      }
    }
    await prisma.$disconnect()
    await connection.quit()
    process.exit(0)
  } catch (e) {
    console.error('Error during worker shutdown', e)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r))
process.on('uncaughtException', (err) => { console.error('uncaughtException', err); shutdown('uncaughtException') })
