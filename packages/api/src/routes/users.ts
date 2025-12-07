import { Router } from 'express'
import prisma from '../prisma-client'
import argon2 from 'argon2'
import auth from '../middleware/auth'

const router = Router()

// List users (ADMIN only)
router.get('/', auth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'forbidden' })
  const users = await prisma.user.findMany({ include: { role: true } })
  const out = users.map(u => ({ id: u.id, email: u.email, role: u.role.name, createdAt: u.createdAt }))
  res.json(out)
})

// Create user (ADMIN only)
router.post('/', auth, async (req, res) => {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'forbidden' })
  const body = req.body as any
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const roleName = typeof body.role === 'string' ? body.role : 'USER'
  if (!email || !password) return res.status(400).json({ message: 'email and password required' })

  // ensure role exists
  let role = await prisma.role.findUnique({ where: { name: roleName } })
  if (!role) {
    role = await prisma.role.create({ data: { name: roleName } })
  }

  try {
    const hash = await argon2.hash(password)
    const user = await prisma.user.create({ data: { email, passwordHash: hash, roleId: role.id } })
    await prisma.auditLog.create({ data: { actorId: req.user!.id, action: 'USER_CREATED', detail: { email: user.email, role: role.name } } })
    res.json({ id: user.id, email: user.email, role: role.name })
  } catch (e: any) {
    console.error('failed to create user', e?.message || e)
    if (e?.code === 'P2002') return res.status(409).json({ message: 'email already exists' })
    res.status(500).json({ message: 'failed to create user' })
  }
})

export default router

