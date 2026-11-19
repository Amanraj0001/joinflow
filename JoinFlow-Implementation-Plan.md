# JoinFlow implementation plan

**Goal** — Help a new hire answer three questions before day one: what do I need to do, what is blocked, and who can unblock it? Give HR and managers a shared view of the same checklist. Build and present the prototype in 48 hours.

## Technology choices

| Layer | Stack | Responsibility |
|---|---|---|
| Web client | React, TypeScript, Vite, Tailwind CSS | Employee checklist and chat, manager approvals, HR dashboard and change preview |
| Application server | Node.js, Express, TypeScript | REST API and compiled React app on one origin |
| Authentication | JWT, jose, bcryptjs | Verify signed, expiring tokens and hashed passwords for seeded accounts. Use an HttpOnly, Secure cookie in production and check request origin for writes. |
| Database | Neon PostgreSQL, Prisma ORM, Prisma Migrate | Persist workflow data, policy sections, and audit events |
| Workflow | Plain TypeScript rules | Select task templates by role and location, resolve dependencies, and calculate readiness |
| Chat | LangChain.js, @langchain/groq, Groq-hosted openai/gpt-oss-20b | Turn approved policy passages and authorized task facts into readable answers |
| Retrieval | PostgreSQL full-text search | Search policy sections by terms after filtering for role, location, and approved version |
| Contracts and observability | Zod, OpenAPI, Pino | Validate inputs and model output, document API contracts, log request IDs, evidence IDs, latency, and fallback reasons |
| Quality | Vitest, Supertest, Playwright, a fixed chatbot evaluation set | Test rules, permissions, API contracts, and the browser journey |
| Delivery | npm, GitHub, GitHub Actions, Render Web Service | Build and test on pull requests, deploy the app, and share one demo URL through the README |

Node.js/Express, JWT, Neon PostgreSQL, and hosted inference reflect the agreed direction. Groq and its hosted open-weight model are implementation choices for this plan. Verify the selected model licence, provider terms, account access, and quota during setup. See [Groq model details](https://console.groq.com/docs/model/openai/gpt-oss-20b).

## What to build

Use three fictional hires, two job roles, two locations, and about twelve templates across documents, equipment, payroll, benefits, training, and manager tasks. Job role determines task eligibility. Access role determines who can read or change a record. Use synthetic documents and simulate external system updates with in-app events.

- **Employee** sees their next available task, day-one blockers, task owners, and a chatbot with clickable evidence.
- **Manager** sees their team's pending decisions. Approving the laptop request unlocks setup and records an activity event.
- **HR** creates a profile, generates a checklist, and previews how changing a location affects open tasks. Applying the preview preserves completed work and records the change.
- **Readiness** is calculated from required day-one tasks. Show “ready” when all are complete. Otherwise show which required tasks remain, including blocked tasks and their owners.

## API and data design

Use tables for users, employee profiles, task templates, template dependencies, assigned tasks, approvals, policy sections, HR handoffs, and audit events. Store the manager relationship, task owner, day-one requirement, and policy applicability explicitly. Use a unique employee/template assignment and apply approvals, task transitions, and audit writes in one transaction so retries cannot duplicate work.

| API | What it does |
|---|---|
| POST /api/auth/login | Verify credentials and issue a JWT |
| POST /api/employees | HR creates a profile and its initial checklist |
| GET /api/me/checklist | Return the signed-in hire’s tasks, readiness, and current blockers |
| POST /api/tasks/:id/complete | Allow the assigned user to complete an eligible task |
| POST /api/approvals/:id/decision | Check managerial authority and update dependent tasks |
| POST /api/employees/:id/change-preview | Return added, removed, and retained tasks without changing records |
| POST /api/employees/:id/apply-change | Recheck the profile version and apply the reviewed change |
| POST /api/chat | Answer an onboarding question using authorized evidence |
| POST /api/handoffs | Send an unresolved question to HR after the user requests it |

## Chatbot workflow

1. Express verifies the JWT and determines the user's identity and permitted records. For an employee, derive the employee ID from that identity.
2. For status questions, fetch current tasks, owners, and unmet dependencies. For policy questions, retrieve applicable approved sections. For mixed questions, use both. Ask for clarification when the subject is unclear.
3. Send the question and minimal evidence to the hosted model through LangChain.js. Require a structured answer containing text, evidence IDs, and an escalation flag.
4. Validate the result with Zod. Only render links whose IDs belong to the retrieved evidence. When a policy answer lacks support, offer an HR handoff. When inference times out, show available checklist facts and policy links directly.
5. Keep chat lookups read-only. Approvals and escalations use their own authenticated actions. Log outcomes and evidence IDs without recording credentials or full employee conversations.

## 48-hour build schedule

| Hours | Work and owner | Exit check |
|---|---|---|
| 0–4 | Team sets up GitHub, Render, Neon, migrations, seed accounts, and model credentials. Agree on expected checklists. | A deployed page reaches Express, the database, and one hosted model response. |
| 4–14 | Backend owner implements auth and task rules. Frontend owner builds role views. AI owner prepares policy sections and expected answers. | Two hires with different profiles receive the expected tasks. Cross-employee reads fail. |
| 14–24 | Connect employee, manager, and HR workflows. Implement approvals, dependencies, readiness, and audit history. | A manager approves a request once and the employee sees the next task unlock after refreshing. |
| 24–34 | Integrate chat retrieval, citations, response validation, HR handoff, and timeout fallback. | A policy answer opens the correct section. The same blocker question changes after approval. |
| 34–40 | Implement profile-change preview and apply. Run permission, retry, and browser tests. | Cancel leaves the checklist intact. Apply preserves completed work. Repeat approval cannot create duplicate events. |
| 40–48 | Freeze features, run evaluations, verify the public demo from a fresh browser, finish README and slides, and record the demo. | A reviewer can start at GitHub, access the demo and recording, and reproduce the project using the README. |

For a three-person team, assign frontend/demo, backend/data, and chatbot/evaluation as the primary responsibilities. Integrate at each exit check.

## Evaluation and submission

Prepare 20 questions before tuning the prompts: six policy questions, six live-status questions, four unsupported questions, and four access-boundary cases. Record expected evidence and outcomes. Report observed counts for correct citations, correct blockers, appropriate handoffs, and denied unauthorized requests. Also record median response time and the result of a forced model timeout. Keep authorization checks and the approval workflow as release gates.

Put **Live Demo**, **10-minute recording**, and instructions for synthetic demo accounts at the top of the README. Include setup commands, an environment variable example with placeholders, migration and seed commands, architecture, API contract, and measured results. Set DATABASE_URL, JWT_SECRET, GROQ_API_KEY, and model configuration on the server. Make the demo reproducible with a documented seed/reset command.

| Recording time | Show |
|---|---|
| 0–1 min | The new hire's problem and the expected day-one outcome |
| 1–3 min | HR creates a hire and explains the generated checklist |
| 3–6 min | Ask what is blocked, approve the laptop request as manager, then repeat the question as the employee |
| 6–8 min | Open a policy citation, escalate an unsupported question, and preview a location change |
| 8–10 min | Show architecture, permission and evaluation results, limitations, and expected impact |

Submit five slides covering problem and user value, workflow and demo, architecture and AI controls, testing and evaluation evidence, and future improvements and expected business impact. Use actual measurements for demonstrated results and label projected impact as an estimate.
