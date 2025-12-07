import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import argon2 from 'argon2'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL
  const password = process.env.SEED_ADMIN_PASSWORD
  if (!email || !password) {
    console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in env')
    process.exit(1)
  }

  // Ensure role
  let role = await prisma.role.findUnique({ where: { name: 'ADMIN' } })
  if (!role) {
    role = await prisma.role.create({ data: { name: 'ADMIN' } })
    console.log('Created ADMIN role')
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log('Admin user already exists:', existing.email)
    return
  }

  const hash = await argon2.hash(password)
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      role: { connect: { id: role.id } }
    }
  })
  console.log('Created admin user:', user.email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

