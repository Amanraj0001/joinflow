import { suggestTriage } from './triage.js'
import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { HttpError } from '../onboarding/workflow.js'
export const kinds = ['Identity document', 'Signed offer']
const scope = (req) =>
  req.user.role === 'Employee' ? req.user.profile.id : req.params.id
const departments = ['IT', 'People', 'Finance', 'Facilities']
const routing = {
  'Laptop not received': ['IT', 'High'],
  'Document upload': ['People', 'Normal'],
  'Company email': ['IT', 'High'],
  'Access permissions': ['IT', 'High'],
  Payroll: ['Finance', 'Normal'],
  Other: ['People', 'Normal'],
}
const docFields = {
  id: true,
  kind: true,
  filename: true,
  status: true,
  reason: true,
  updatedAt: true,
  employeeId: true,
}
export async function notify(db, employeeId, key, body) {
  await db.notice.upsert({
    where: { employeeId_key: { employeeId, key } },
    update: {},
    create: { employeeId, key, body },
  })
}
export async function employeeExtras(db, p) {
  const now = Date.now(),
    items = []
  for (const t of p.tasks) {
    items.push({ key: 'assigned:' + t.id, body: 'Assigned: ' + t.title })
    if (t.due && t.status !== 'Complete') {
      const days = (new Date(t.due) - now) / 86400000
      if (days <= 7)
        items.push({
          key:
            (days < 0 ? 'overdue:' : 'upcoming:') +
            t.id +
            ':' +
            new Date(t.due).toISOString(),
          body:
            t.title +
            (days < 0 ? ' is overdue.' : ' is due within seven days.'),
        })
    }
    if (t.category === 'Equipment' && t.status !== 'Blocked')
      items.push({
        key: 'access:' + t.id + ':' + t.status,
        body: t.title + ' · ' + t.status,
      })
  }
  if (items.length)
    await db.notice.createMany({
      data: items.map((item) => ({ ...item, employeeId: p.id })),
      skipDuplicates: true,
    })
  const where = { employeeId: p.id }
  const [documents, issues, notifications, contacts] = await Promise.all([
    db.submission.findMany({ where, select: docFields }),
    db.issue.findMany({ where, orderBy: { createdAt: 'desc' } }),
    db.notice.findMany({ where, orderBy: { createdAt: 'desc' } }),
    db.user.findMany({
      where: { role: 'HR', verified: true },
      select: { id: true, name: true },
    }),
  ])
  return {
    requiredDocuments: kinds,
    documents,
    issues,
    notifications,
    contacts,
  }
}
export function employeeRoutes(app, db, role) {
  app.post('/api/documents', role('Employee'), async (req, res) => {
    const { kind, filename, file } = z
      .object({
        kind: z.enum(kinds),
        filename: z.string().min(1).max(150),
        file: z.string().max(7000000),
      })
      .strict()
      .parse(req.body)
    const bytes = Buffer.from(file, 'base64')
    if (
      bytes.length > 5 * 1024 * 1024 ||
      bytes.subarray(0, 5).toString() !== '%PDF-'
    )
      throw new HttpError(400, 'Upload a PDF smaller than 5 MB.')
    const employeeId = req.user.profile.id
    await db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Employee" WHERE id=${employeeId} FOR UPDATE`
      const old = await tx.submission.findUnique({
        where: { employeeId_kind: { employeeId, kind } },
      })
      if (old && old.status !== 'Rejected')
        throw new HttpError(409, 'Only rejected documents can be replaced.')
      await tx.submission.upsert({
        where: { employeeId_kind: { employeeId, kind } },
        create: { employeeId, kind, filename, bytes, mime: 'application/pdf' },
        update: { filename, bytes, status: 'Pending Review', reason: null },
      })
    })
    res.json({ ok: true })
  })
  app.get(
    '/api/documents/:id/download',
    role('Employee', 'HR'),
    async (req, res) => {
      const d = await db.submission.findFirstOrThrow({
        where: {
          id: req.params.id,
          ...(req.user.role === 'Employee'
            ? { employeeId: req.user.profile.id }
            : {}),
        },
      })
      res
        .attachment(d.filename.replace(/[^\w. -]/g, '_'))
        .set('Content-Type', 'application/octet-stream')
        .send(d.bytes)
    }
  )
  app.post('/api/documents/:id/review', role('HR'), async (req, res) => {
    const { status, reason, updatedAt } = z
      .object({
        status: z.enum(['Approved', 'Rejected']),
        updatedAt: z.iso.datetime(),
        reason: z.string().trim().max(1500).default(''),
      })
      .parse(req.body)
    if (status === 'Rejected' && !reason)
      throw new HttpError(400, 'Give a reason for rejection.')
    await db.$transaction(async (tx) => {
      const d = await tx.submission.update({
        where: {
          id: req.params.id,
          status: 'Pending Review',
          updatedAt: new Date(updatedAt),
        },
        data: { status, reason },
      })
      await notify(
        tx,
        d.employeeId,
        'document:' + randomUUID(),
        d.kind + ' · ' + status + (reason ? ' · ' + reason : '')
      )
    })
    res.json({ ok: true })
  })
  app.post('/api/issues', role('Employee'), async (req, res) => {
    const { category, description } = z
      .object({
        category: z.enum(Object.keys(routing)),
        description: z.string().trim().min(1).max(3000),
      })
      .strict()
      .parse(req.body)
    const [department, priority] = routing[category]
    const triage = await suggestTriage(category, description)
    res.status(201).json(
      await db.issue.create({
        data: {
          category,
          description,
          employeeId: req.user.profile.id,
          department,
          priority,
          ...(triage ? { triage } : {}),
        },
      })
    )
  })
  app.post(
    '/api/issues/:id/update',
    role('HR', 'Manager'),
    async (req, res) => {
      const { department, status, body } = z
        .object({
          department: z.enum(departments),
          status: z.enum(['Open', 'In progress', 'Escalated', 'Resolved']),
          body: z.string().trim().min(1).max(2000),
        })
        .parse(req.body)
      await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Issue" WHERE id=${req.params.id} FOR UPDATE`
        const i = await tx.issue.findUniqueOrThrow({
          where: { id: req.params.id },
        })
        if (
          req.user.role === 'Manager' &&
          (i.department !== req.user.department || department !== i.department)
        )
          throw new HttpError(
            403,
            'This request belongs to another department.'
          )
        await tx.issue.update({
          where: { id: i.id },
          data: {
            department,
            status,
            updates: [
              ...i.updates,
              { body, author: req.user.name, at: new Date().toISOString() },
            ],
          },
        })
        await notify(
          tx,
          i.employeeId,
          'issue:' + randomUUID(),
          i.category + ' · ' + status + ' · ' + body
        )
      })
      res.json({ ok: true })
    }
  )
  app.post(
    '/api/notifications/:id/read',
    role('Employee'),
    async (req, res) => {
      await db.notice.update({
        where: { id: req.params.id, employeeId: req.user.profile.id },
        data: { read: true },
      })
      res.json({ ok: true })
    }
  )
  async function participants(req) {
    const employeeId = scope(req),
      hrId = req.user.role === 'HR' ? req.user.id : req.params.id
    await db.user.findFirstOrThrow({
      where: { id: hrId, verified: true, role: 'HR' },
    })
    await db.employee.findUniqueOrThrow({
      where: { id: employeeId },
      select: { id: true },
    })
    return { employeeId, hrId }
  }
  app.get('/api/messages/:id', role('Employee', 'HR'), async (req, res) =>
    res.json(
      await db.message.findMany({
        where: await participants(req),
        orderBy: { createdAt: 'asc' },
      })
    )
  )
  app.post('/api/messages/:id', role('Employee', 'HR'), async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(3000) })
      .strict()
      .parse(req.body)
    const pair = await participants(req)
    await db.$transaction(async (tx) => {
      const m = await tx.message.create({
        data: {
          ...pair,
          body,
          senderId: req.user.id,
          senderName: req.user.name,
        },
      })
      if (req.user.role === 'HR')
        await notify(
          tx,
          pair.employeeId,
          'message:' + m.id,
          'New message from ' + req.user.name
        )
    })
    res.status(201).json({ ok: true })
  })
}
export async function hrExtras(db) {
  const [documents, issues, history] = await Promise.all([
    db.submission.findMany({
      select: docFields,
      orderBy: { updatedAt: 'desc' },
    }),
    db.issue.findMany({ orderBy: { createdAt: 'desc' } }),
    db.audit.findMany({
      include: { actor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  return { documents, issues, history }
}
