import { z } from 'zod'
import { chat } from './chat.js'
import { HttpError } from '../onboarding/workflow.js'

export function assistantRoutes(app, db, role, options) {
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
    const { answer } = z
      .object({ answer: z.string().trim().min(1).max(4000) })
      .strict()
      .parse(req.body)
    const id = req.params.id
    const { count } = await db.handoff.updateMany({
      where: { id, answeredAt: null },
      data: { answer, answeredAt: new Date(), answeredBy: req.user.name },
    })
    if (!count) {
      if (
        !(await db.handoff.findUnique({ where: { id }, select: { id: true } }))
      )
        throw new HttpError(404, 'Question not found.')
      throw new HttpError(
        409,
        'This question already has an answer. Refresh to read it.'
      )
    }
    res.json({ ok: true })
  })
}
