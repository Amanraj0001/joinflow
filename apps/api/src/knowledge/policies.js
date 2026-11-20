import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { rag } from './retrieval.js'
import { HttpError } from '../onboarding/workflow.js'
const optional = z.string().trim().max(100).optional()
const source = z
  .object({
    title: z.string().trim().min(1).max(160),
    text: z.string().max(150000).default(''),
    pdf: z.string().max(7000000).optional(),
    department: optional,
    job: optional,
    location: optional,
    mode: z.enum(['append', 'replace', 'reindex']).default('replace'),
    version: z.number().int().optional(),
  })
  .strict()
export function policyRoutes(app, db, role) {
  app.get('/api/policies', role('Manager', 'HR'), async (req, res) =>
    res.json(
      await db.policy.findMany({
        where: { archived: false },
        select: {
          id: true,
          title: true,
          version: true,
          body: true,
          processing: true,
          ownerId: true,
          department: true,
          job: true,
          location: true,
        },
        orderBy: { title: 'asc' },
      })
    )
  )
  async function manage(req, res) {
    const v = source.parse(req.body),
      id = req.params.id || randomUUID()
    const old = req.params.id
      ? await db.policy.findUniqueOrThrow({ where: { id } })
      : null
    if (old?.ownerId && old.ownerId !== req.user.id)
      throw new HttpError(403, 'Only the owning manager can edit this policy.')
    if (old && (old.archived || old.version !== v.version))
      throw new HttpError(409, 'Refresh the policy version.')
    if (v.mode === 'reindex' && !old)
      throw new HttpError(400, 'Select an existing policy to reindex.')
    const pdf =
      v.mode === 'reindex'
        ? old?.sourcePdf
        : v.pdf
          ? Buffer.from(v.pdf, 'base64')
          : null
    if (pdf && pdf.subarray(0, 5).toString() !== '%PDF-')
      throw new HttpError(400, 'Select a PDF file.')
    const text =
      v.mode === 'reindex'
        ? (old.sourceText ?? old.body)
        : (v.mode === 'append' ? (old?.body || '') + '\n' : '') + v.text
    let indexed,
      processing = 'Ready'
    try {
      indexed = await rag('/index', {
        title: v.title,
        text,
        pdf: pdf?.toString('base64'),
      })
    } catch {
      processing = 'Failed'
      indexed = { text, chunks: [] }
    }
    const data = {
      title: v.title,
      body: indexed.text.slice(0, 150000),
      sourceText: text,
      sourcePdf: pdf,
      processing,
      chunks: indexed.chunks,
      approved: processing === 'Ready',
      ownerId: req.user.id,
      department: v.department || null,
      location: v.location || null,
      job: v.job || null,
    }
    if (old) {
      const r = await db.policy.updateMany({
        where: { id, version: v.version, archived: false },
        data: { ...data, version: { increment: 1 } },
      })
      if (!r.count)
        throw new HttpError(409, 'Policy changed during processing.')
    } else await db.policy.create({ data: { ...data, id, version: 1 } })
    res.json({ id, processing })
  }
  app.post('/api/policies', role('Manager'), manage)
  app.post('/api/policies/:id/edit', role('Manager'), manage)
  app.post('/api/policies/:id/remove', role('Manager'), async (req, res) => {
    const { version } = z.object({ version: z.number().int() }).parse(req.body)
    const r = await db.policy.updateMany({
      where: {
        id: req.params.id,
        version,
        archived: false,
        OR: [{ ownerId: null }, { ownerId: req.user.id }],
      },
      data: { archived: true, approved: false, version: { increment: 1 } },
    })
    if (!r.count)
      throw new HttpError(
        409,
        'Policy is unavailable or owned by another manager.'
      )
    res.json({ ok: true })
  })
  app.post('/api/policies/:id/suggest', role('HR'), async (req, res) => {
    const { body } = z
      .object({ body: z.string().trim().min(1).max(3000) })
      .parse(req.body)
    await db.policy.findFirstOrThrow({
      where: { id: req.params.id, archived: false },
    })
    res.status(201).json(
      await db.policySuggestion.create({
        data: { policyId: req.params.id, author: req.user.name, body },
      })
    )
  })
  app.post('/api/suggestions/:id/review', role('Manager'), async (req, res) => {
    const { status } = z
      .object({ status: z.enum(['Reviewed', 'Declined']) })
      .parse(req.body)
    const s = await db.policySuggestion.findUniqueOrThrow({
      where: { id: req.params.id },
    })
    await db.policy.findFirstOrThrow({
      where: {
        id: s.policyId,
        OR: [{ ownerId: null }, { ownerId: req.user.id }],
      },
    })
    await db.policySuggestion.update({ where: { id: s.id }, data: { status } })
    res.json({ ok: true })
  })
}
