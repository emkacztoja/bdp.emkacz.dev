import 'dotenv/config'
import { createServer } from 'http'
import app from './app'
import prisma from './prisma-client'
import config from './config'

const PORT = config.PORT

const server = createServer(app)
server.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`)
})

async function shutdown(signal?: string) {
  console.log('Shutting down', signal || '')
  try {
    server.close(() => console.log('HTTP server closed'))
    await prisma.$disconnect()
    process.exit(0)
  } catch (e) {
    console.error('Error during shutdown', e)
    process.exit(1)
  }
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('unhandledRejection', (r) => console.error('unhandledRejection', r))
process.on('uncaughtException', (err) => { console.error('uncaughtException', err); shutdown('uncaughtException') })
