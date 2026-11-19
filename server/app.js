import express from 'express'
import { randomBytes, randomUUID } from 'node:crypto'
import path from 'node:path'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { z } from 'zod'
import pino from 'pino'
import { jobs, locations } from './catalog.js'
import {
  assign,
  checklist,
  eligible,
  HttpError,
  lockProfile,
  preview,
  record,
  safeUser,
} from './workflow.js'
import { chat } from './chat.js'

export function createApp(db, options = {}) {
  const app = express()
  const production = process.env.NODE_ENV === 'production'
  const secret =
    process.env.JWT_SECRET || (!production && randomBytes(48).toString('hex'))
  if (
    !secret ||
    secret.length < 32 ||
    (production && secret.startsWith('replace-with'))
  )
    throw Error('Configure a random JWT_SECRET of at least 32 characters.')
  const key = new TextEncoder().encode(secret)
  const origin =
    process.env.APP_ORIGIN ||
    process.env.RENDER_EXTERNAL_URL ||
    'http://localhost:5173'
  const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
  const cookie = {
    httpOnly: true,
    sameSite: 'lax',
    secure: production,
    path: '/',
  }
  app.disable('x-powered-by')
  app.use(
    '/api',
    (req, res, next) => {
      req.requestId = randomUUID()
      res.set({
        'X-Request-ID': req.requestId,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      const start = Date.now()
      res.on('finish', () =>
        logger.info({
          requestId: req.requestId,
          route: req.route?.path,
          status: res.statusCode,
          latencyMs: Date.now() - start,
          ...res.locals.chat,
        })
      )
      if (req.method === 'POST' && req.headers.origin !== origin)
        return next(new HttpError(403, 'Request origin is not allowed.'))
      next()
    },
    express.json({ limit: '12kb' })
  )
  app.get('/api/health', async (req, res) => {
    await db.$queryRaw`SELECT 1`
    res.json({ ok: true })
  })
  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = z
      .object({
        email: z.email().max(254),
        password: z.string().min(1).max(128),
      })
      .strict()
      .parse(req.body)
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })
    if (!user || !(await bcrypt.compare(password, user.hash)))
      throw new HttpError(401, 'Email or password is incorrect.')
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('joinflow')
      .setAudience('workspace')
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(key)
    res
      .cookie('joinflow', token, { ...cookie, maxAge: 8 * 3600000 })
      .json({ ok: true })
  })
  app.use('/api', async (req, res, next) => {
    const token = req.headers.cookie
      ?.split(/;\s*/)
      .find((c) => c.startsWith('joinflow='))
      ?.slice(9)
    let sub
    try {
      sub = (
        await jwtVerify(token, key, {
          algorithms: ['HS256'],
          issuer: 'joinflow',
          audience: 'workspace',
        })
      ).payload.sub
    } catch {
      throw new HttpError(401, 'Please sign in.')
    }
    req.user = await db.user.findUnique({
      where: { id: sub },
      select: { ...safeUser, profile: { select: { id: true } } },
    })
    if (!req.user) throw new HttpError(401, 'Please sign in.')
    next()
  })
  const role =
    (...roles) =>
    (req, res, next) =>
      roles.includes(req.user.role)
        ? next()
        : next(new HttpError(403, 'Your role cannot perform this action.'))
  app.get('/api/me', (req, res) => res.json(req.user))
  app.post('/api/auth/logout', (req, res) =>
    res.clearCookie('joinflow', cookie).json({ ok: true })
  )
  app.get('/api/me/checklist', role('Employee'), async (req, res) => {
    const id = req.user.profile.id
    const [profile, handoffs] = await Promise.all([
      checklist(db, id),
      db.handoff.findMany({ where: { employeeId: id }, orderBy: { createdAt: 'desc' } }),
    ])
    res.json({ ...profile, handoffs })
  })
  app.get('/api/team', role('Manager', 'HR'), async (req, res) => {
    const ids = await db.employee.findMany({
      where: req.user.role === 'Manager' ? { managerId: req.user.id } : {},
      select: { id: true },
      orderBy: { user: { name: 'asc' } },
    })
    const people = await Promise.all(ids.map((e) => checklist(db, e.id)))
    const managers =
      req.user.role === 'HR'
        ? await db.user.findMany({
            where: { role: 'Manager' },
            select: safeUser,
          })
        : []
    const handoffs =
      req.user.role === 'HR'
        ? await db.handoff.findMany({
            orderBy: { createdAt: 'desc' },
          })
        : []
    res.json({ people, managers, handoffs })
  })
  app.post('/api/employees', role('HR'), async (req, res) => {
    const { name, email, password, job, location, managerId, startDate } = z
      .object({
        name: z.string().trim().min(1).max(80),
        email: z.email().max(254),
        password: z.string().min(10).max(72),
        job: z.enum(jobs),
        location: z.enum(locations),
        managerId: z.string(),
        startDate: z.iso.date(),
      })
      .strict()
      .parse(req.body)
    const hash = await bcrypt.hash(password, 12)
    const employee = await db.$transaction(async (tx) => {
      if (
        !(await tx.user.findFirst({
          where: { id: managerId, role: 'Manager' },
        }))
      )
        throw new HttpError(400, 'Choose a manager.')
      const user = await tx.user.create({
        data: { name, email: email.toLowerCase(), hash, role: 'Employee' },
      })
      const profile = await tx.employee.create({
        data: {
          userId: user.id,
          job,
          location,
          managerId,
          startDate: new Date(startDate),
        },
      })
      await assign(
        tx,
        profile,
        (await tx.template.findMany()).filter((t) => eligible(t, profile))
      )
      return record(
        tx,
        profile.id,
        req.user.id,
        'Created the onboarding checklist.'
      )
    })
    res.status(201).json(employee)
  })
  app.post('/api/tasks/:id/complete', role('Employee'), async (req, res) => {
    await db.$transaction(async (tx) => {
      const employee = await lockProfile(tx, req.user.profile.id)
      const task = (await checklist(tx, employee.id)).tasks.find(
        (t) => t.id === req.params.id && t.owner.id === req.user.id
      )
      if (!task) throw new HttpError(404, 'Task not found.')
      if (task.status === 'Complete') return
      if (task.status !== 'Available')
        throw new HttpError(409, 'Complete the prerequisites first.')
      await tx.task.update({
        where: { id: task.id },
        data: { completedAt: new Date() },
      })
      await record(
        tx,
        employee.id,
        req.user.id,
        'Completed ' + task.title + '.'
      )
    })
    res.json({ ok: true })
  })
  app.post('/api/approvals/:id/decision', role('Manager'), async (req, res) => {
    const { decision } = z
      .object({ decision: z.enum(['approved', 'declined']) })
      .strict()
      .parse(req.body)
    await db.$transaction(async (tx) => {
      const item = await tx.approval.findFirst({
        where: {
          id: req.params.id,
          task: {
            active: true,
            ownerId: req.user.id,
            employee: { managerId: req.user.id },
          },
        },
        include: { task: true },
      })
      if (!item) throw new HttpError(404, 'Approval not found.')
      await lockProfile(tx, item.task.employeeId)
      const task = (await checklist(tx, item.task.employeeId)).tasks.find(
        (t) => t.id === item.task.id
      )
      if (!task)
        throw new HttpError(409, 'Checklist changed. Refresh your view.')
      if (task.approval.decision === decision) return
      if (task.approval.decision || task.status !== 'Available')
        throw new HttpError(409, 'This decision is closed.')
      await tx.approval.update({
        where: { id: item.id },
        data: { decision, decidedAt: new Date() },
      })
      if (decision === 'approved')
        await tx.task.update({
          where: { id: task.id },
          data: { completedAt: new Date() },
        })
      await record(
        tx,
        item.task.employeeId,
        req.user.id,
        task.title + ' was ' + decision + '.'
      )
    })
    res.json({ ok: true })
  })
  const change = z.object({ location: z.enum(locations) }).strict()
  app.post(
    '/api/employees/:id/change-preview',
    role('HR'),
    async (req, res) => {
      const { location } = change.parse(req.body)
      res.json(
        await db.$transaction(async (tx) =>
          preview(tx, await lockProfile(tx, req.params.id), location)
        )
      )
    }
  )
  app.post('/api/employees/:id/apply-change', role('HR'), async (req, res) => {
    const { location, version } = change
      .extend({ version: z.number().int().positive() })
      .parse(req.body)
    await db.$transaction(async (tx) => {
      const employee = await lockProfile(tx, req.params.id)
      if (version !== employee.version)
        throw new HttpError(
          409,
          'The checklist changed. Preview the change again.'
        )
      if (location === employee.location) return
      const delta = await preview(tx, employee, location)
      await tx.task.updateMany({
        where: {
          employeeId: employee.id,
          templateId: { in: delta.removed.map((t) => t.id) },
        },
        data: { active: false },
      })
      await assign(tx, employee, delta.added)
      await tx.employee.update({
        where: { id: employee.id },
        data: { location },
      })
      await record(
        tx,
        employee.id,
        req.user.id,
        'Changed location from ' + employee.location + ' to ' + location + '.'
      )
    })
    res.json({ ok: true })
  })
  const question = z
    .object({ question: z.string().trim().min(1).max(1000) })
    .strict()
  app.post('/api/chat', role('Employee'), async (req, res) => {
    const result = await chat(
      db,
      req.user.profile.id,
      question.parse(req.body).question,
      options.chat
    )
    res.locals.chat = {
      outcome: result.mode,
      evidenceIds: result.evidence.map((e) => e.id),
    }
    res.json(result)
  })
  app.post('/api/handoffs', role('Employee'), async (req, res) => {
    const handoff = await db.handoff.create({
      data: { employeeId: req.user.profile.id, ...question.parse(req.body) },
    })
    res.status(201).json({ id: handoff.id })
  })
  app.post('/api/handoffs/:id/reply', role('HR'), async (req, res) => {
    const { answer } = z.object({ answer: z.string().trim().min(1).max(4000) }).strict().parse(req.body)
    const id = req.params.id
    const { count } = await db.handoff.updateMany({
      where: { id, answeredAt: null },
      data: { answer, answeredAt: new Date(), answeredBy: req.user.name },
    })
    if (!count) {
      if (!await db.handoff.findUnique({ where: { id }, select: { id: true } }))
        throw new HttpError(404, 'Question not found.')
      throw new HttpError(409, 'This question already has an answer. Refresh to read it.')
    }
    res.json({ ok: true })
  })
  app.use('/api', (req, res) =>
    res.status(404).json({ error: 'Route not found.' })
  )
  app.use(express.static('dist'))
  app.get('/{*path}', (req, res) =>
    res.sendFile(path.resolve('dist/index.html'))
  )
  app.use((err, req, res, next) => {
    const status =
      err instanceof z.ZodError
        ? 400
        : err.code === 'P2002'
          ? 409
          : err.status || 500
    const message =
      err instanceof HttpError
        ? err.message
        : err instanceof z.ZodError
          ? 'Invalid ' + (err.issues[0].path.join('.') || 'request') + '.'
          : err.code === 'P2002'
            ? 'An account with this email already exists.'
            : status >= 500
              ? 'The server could not complete the request.'
              : 'Invalid request.'
    if (status >= 500)
      logger.error({
        requestId: req.requestId,
        errorType: err.name,
        code: err.code,
      })
    res.status(status).json({ error: message })
  })
  return app
}
