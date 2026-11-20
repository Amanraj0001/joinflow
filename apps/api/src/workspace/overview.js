import { checklist, safeUser } from '../onboarding/workflow.js'
import { employeeExtras, hrExtras } from '../employee/services.js'

export function overviewRoutes(app, db, role) {
  app.get('/api/me/checklist', role('Employee'), async (req, res) => {
    const id = req.user.profile.id
    const [profile, handoffs] = await Promise.all([
      checklist(db, id),
      db.handoff.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
      }),
    ])
    res.json({ ...profile, handoffs, ...(await employeeExtras(db, profile)) })
  })
  app.get('/api/team', role('Manager', 'HR'), async (req, res) => {
    const ids = await db.employee.findMany({
      where: req.user.role === 'Manager' ? { managerId: req.user.id } : {},
      select: { id: true },
      orderBy: { user: { name: 'asc' } },
    })
    const people = await Promise.all(
      ids.map((e) => checklist(db, e.id, req.user.role === 'HR'))
    )
    const managers =
      req.user.role === 'HR'
        ? await db.user.findMany({
            where: { role: 'Manager', verified: true },
            select: safeUser,
          })
        : []
    const handoffs =
      req.user.role === 'HR'
        ? await db.handoff.findMany({
            orderBy: { createdAt: 'desc' },
          })
        : []
    const roles = await db.jobRole.findMany({ orderBy: { name: 'asc' } })
    const registrations =
      req.user.role === 'Manager'
        ? await db.user.findMany({
            where: { verified: false },
            select: safeUser,
          })
        : []
    const suggestions = await db.policySuggestion.findMany({
      orderBy: { createdAt: 'desc' },
    })
    const staff = await db.user.findMany({
      where: { verified: true, role: 'HR' },
      select: safeUser,
    })
    res.json({
      people,
      managers,
      handoffs,
      roles,
      registrations,
      suggestions,
      staff,
      ...(req.user.role === 'HR'
        ? await hrExtras(db)
        : {
            issues: await db.issue.findMany({
              where: { department: req.user.department },
              orderBy: { createdAt: 'desc' },
              include: {
                employee: { select: { user: { select: { name: true } } } },
              },
            }),
          }),
    })
  })
}
