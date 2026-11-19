import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { templates, policies } from '../server/catalog.js'
import { assign, eligible } from '../server/workflow.js'
const db = new PrismaClient()
try {
  const password = process.env.DEMO_PASSWORD
  if (!password || password.length < 10)
    throw Error('Set DEMO_PASSWORD to at least 10 characters before seeding.')
  const hash = await bcrypt.hash(password, 12)
  await db.$transaction(
    async (tx) => {
      async function account(name, slug, role) {
        const email = slug + '@joinflow.example'
        return tx.user.upsert({
          where: { email },
          update: {},
          create: { name, email, role, hash },
        })
      }
      const manager = await account('Sam Rivera', 'sam', 'Manager')
      const hr = await account('Ellis Morgan', 'ellis', 'HR')
      for (const t of templates)
        await tx.template.upsert({ where: { id: t.id }, update: t, create: t })
      for (const [childId, parentId] of [
        ['setup', 'laptop'],
        ['repo', 'setup'],
        ['repo', 'security'],
      ])
        await tx.dependency.upsert({
          where: { childId_parentId: { childId, parentId } },
          update: {},
          create: { childId, parentId },
        })
      for (const p of policies)
        await tx.policy.upsert({ where: { id: p.id }, update: p, create: p })
      for (const [name, slug, job, location] of [
        ['Alex Park', 'alex', 'Engineering', 'London'],
        ['Maya Chen', 'maya', 'Operations', 'Austin'],
        ['Noah Lane', 'noah', 'Engineering', 'Austin'],
      ]) {
        const user = await account(name, slug, 'Employee')
        if (await tx.employee.findUnique({ where: { userId: user.id } }))
          continue
        const employee = await tx.employee.create({
          data: {
            userId: user.id,
            managerId: manager.id,
            job,
            location,
            startDate: new Date('2027-01-11T12:00:00Z'),
          },
        })
        await assign(
          tx,
          employee,
          templates.filter((t) => eligible(t, employee))
        )
        await tx.task.updateMany({
          where: { employeeId: employee.id, templateId: 'welcome' },
          data: { completedAt: new Date() },
        })
        await tx.audit.create({
          data: {
            employeeId: employee.id,
            actorId: hr.id,
            message: 'Created the onboarding checklist.',
          },
        })
      }
    },
    { timeout: 60000 }
  )
  console.log('JoinFlow demo accounts and templates are ready.')
} finally {
  await db.$disconnect()
}
