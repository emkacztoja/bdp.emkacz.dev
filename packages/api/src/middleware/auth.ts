import { Request, Response, NextFunction } from 'express'
import { verifySession } from '../lib/jwt'
import prisma from '../prisma-client'

declare global {
  namespace Express {
    interface Request {
      user?: any
    }
  }
}

export default async function auth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.__session || req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: 'unauthenticated' })
  const payload = verifySession(token)
  if (!payload) return res.status(401).json({ message: 'invalid session' })
  const user = await prisma.user.findUnique({ where: { id: (payload as any).sub }, include: { role: true } })
  if (!user) return res.status(401).json({ message: 'user not found' })
  req.user = { id: user.id, email: user.email, role: user.role.name }
  next()
}

