import { Router } from 'express'
import prisma from '../prisma-client'
import argon2 from 'argon2'
import { signSession, verifySession } from '../lib/jwt'
import config from '../config'
import rateLimit from 'express-rate-limit'

const router = Router()

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again later' },
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } })
  if (!user) return res.status(401).json({ message: 'invalid credentials' })
  const ok = await argon2.verify(user.passwordHash, password)
  if (!ok) return res.status(401).json({ message: 'invalid credentials' })

  const token = signSession({ sub: user.id, role: user.role.name })
  const cookieOpts: any = {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: config.COOKIE_SAMESITE as any,
    maxAge: 2 * 60 * 60 * 1000,
    path: '/',
  }
  if (config.COOKIE_DOMAIN) cookieOpts.domain = config.COOKIE_DOMAIN

  res.cookie('__session', token, cookieOpts)

  res.json({ user: { id: user.id, email: user.email, role: user.role.name } })
})

router.post('/logout', (req, res) => {
  res.clearCookie('__session', { path: '/', domain: config.COOKIE_DOMAIN })
  res.json({ ok: true })
})

// Basic rate-limiting middleware
// router.use((req, res, next) => {
//   const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress
//   console.log(`Request from IP: ${ip}`)
//   next()
// })

export default router
