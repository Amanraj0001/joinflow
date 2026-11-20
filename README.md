# JoinFlow

**Live demo** · [Local workspace](http://localhost:5173) after setup. A public Render URL can be added after deployment.  
**Original prototype recording** · [Watch the captioned walkthrough](docs/joinflow-walkthrough.webm) · [Download the five-slide deck](docs/JoinFlow.pptx)

JoinFlow gives a new hire one checklist with task owners, current blockers, and a day-one readiness count. Managers review decisions for their direct reports. HR creates hires, reviews questions, and previews office moves.

## Demo accounts

Select a role on the sign-in screen to fill its email. The local example password is `WelcomeDemo123!`. A hosted deployment uses the password set by its operator when the database is first seeded. All names, policies, addresses, and onboarding records are fictional.

| Workspace | Account | Scenario |
| --- | --- | --- |
| Employee | alex@joinflow.example | Engineering in London. Workstation setup needs Sam’s laptop approval. |
| Employee | maya@joinflow.example | Operations in Austin. Receives the operations playbook. |
| Employee | noah@joinflow.example | Engineering in Austin. Receives the Austin access-pass task. |
| Manager | sam@joinflow.example | Reviews the three hires’ pending decisions. |
| HR | ellis@joinflow.example | Creates hires, previews changes, and answers employee questions in the HR inbox. |

## Run locally

Use Node.js 24, npm and Python 3.12+. In PowerShell, use `npm.cmd` and `npx.cmd` if script execution policy blocks the PowerShell shims.

```powershell
npm.cmd ci
python -m venv .local/rag-env
& .local/rag-env/Scripts/python.exe -m pip install -r services/rag/requirements.txt
Copy-Item .env.example .env
npm.cmd run db:local
```

Keep the database terminal open. The development helper runs a real PostgreSQL server on loopback port 55439 and stores its files in the ignored `.local/` directory. You can also supply an existing PostgreSQL or Neon connection in `DATABASE_URL` and skip the local database command.

In a second terminal, run the following commands. Open the exact localhost URL shown above so the browser origin matches `APP_ORIGIN`.

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

On macOS or Linux, create the venv with `python3 -m venv .local/rag-env` and install with `.local/rag-env/bin/python -m pip install -r services/rag/requirements.txt`. Use `cp .env.example .env` and the regular `npm` command. The dev script starts Vite on port 5173 and Express on port 3001. Vite proxies API calls to Express. For a local single-server build, set `APP_ORIGIN=http://localhost:3001` in `.env`, run `npm run build`, then `npm start`, and open port 3001.

## Publish to GitHub

Create an empty GitHub repository. From the project root, run the following with your repository URL. The ignore rules exclude environment secrets, local PostgreSQL files, build output, and dependencies.

```sh
git init -b main
git add .
git status
git commit -m "Build JoinFlow onboarding workspace"
git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
git push -u origin main
```

Pushes and pull requests trigger a Linux build, PostgreSQL integration tests, and a Chromium browser journey. The lockfile pins the dependency tree.

## Deploy to Render with Neon

1. Create a dedicated Neon PostgreSQL database for the demo. Copy its direct connection URL with the SSL parameters Neon provides. The database user needs permission to create tables and apply migrations.
2. In Render, create a Blueprint and connect the GitHub repository. The included `render.yaml` defines one Docker web service running Express and a loopback-only FastAPI retrieval worker with `/api/health` as its database-backed health check.
3. Configure `SMTP_URL` and `MAIL_FROM` for personal-email invitations and password resets. Supply `DATABASE_URL` and a `DEMO_PASSWORD` of at least ten characters. The Blueprint generates `JWT_SECRET`. Set `GROQ_API_KEY` in the service environment to enable hosted answers.
4. Deploy. The Docker build installs Node and Python dependencies, generates Prisma Client, and compiles React. Startup applies pending migrations, runs the idempotent seed, and starts Express on Render’s assigned port. Existing employee progress survives redeployments.
5. Open the service URL, sign in, and repeat the laptop approval journey. For a custom domain, set `APP_ORIGIN` to its exact HTTPS origin without a trailing slash. Replace the local demo link above when ready to share.

Render supplies `RENDER_EXTERNAL_URL` as the default production origin. Keep the database and model key in server environment variables. The Blueprint uses a free web instance and an external Neon database. [Render Blueprint reference](https://render.com/docs/blueprint-spec)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection for Prisma and migrations |
| `JWT_SECRET` | Random signing secret of at least 32 characters. Local development generates an ephemeral key if left empty. Generate one with `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`. |
| `DEMO_PASSWORD` | Initial password for the five synthetic accounts. Reseeding preserves existing passwords. |
| `APP_ORIGIN` | Allowed browser origin for POST requests, including login |
| `GROQ_API_KEY`, `GROQ_MODEL` | Optional hosted inference. The default model is `openai/gpt-oss-20b`. |
| `PORT`, `NODE_ENV` | Listener port and environment. Production enables Secure session cookies. |
| `TEST_DATABASE_URL` | Dedicated PostgreSQL database used for isolated test schemas |
| `PLAYWRIGHT_CHANNEL` | Optional installed browser channel, for example `chrome` |

The selected model weights use Apache 2.0. GroqCloud account access and quota depend on the operator’s account. Hosted inference was not exercised in the local evaluation. [Model release](https://openai.com/index/introducing-gpt-oss/) · [Groq model details](https://console.groq.com/docs/model/openai/gpt-oss-20b) · [Groq services agreement](https://console.groq.com/docs/legal/services-agreement)

## Project layout

| Directory | Responsibility |
| --- | --- |
| `apps/web/src` | React navigation and feature modules for authentication, employees, staff and shared controls |
| `apps/api/src` | Express composition, centralized environment configuration and modules for accounts, onboarding, workspace data, employee services and knowledge management |
| `services/rag` | Private Python FastAPI service for PDF extraction, LangChain chunking, embeddings and scoped retrieval |
| `prisma` | PostgreSQL models, additive migrations and idempotent demo seed |
| `scripts`, `tests` | Process startup, local database, isolated API and browser tests |
| `dist/`, `.local/` | Ignored build output, development database, virtual environment and development-only email outbox |

## Portal workflows

Employees sign in with HR-created accounts. The dashboard shows their profile, completion, deadlines and notifications. My Tasks retains the original dependencies and approvals. My Documents accepts private PDFs up to 5 MB and permits replacement after HR rejection. Equipment & Access shows provisioning progress. Help & Support offers a private conversation with a selected HR representative, categorized support requests and answers to questions forwarded from the assistant.

Managers verify staff registrations, define job roles with role-specific steps, review team decisions and manage scoped policies. PDF or text policies can be appended, replaced, reindexed or archived. The owning manager controls edits. HR can propose changes. A failed index is visible in Policies and can be retried.

HR creates a single employee profile with a work login, personal recovery address, designation, department, manager, office and joining date. The employee receives a time-limited password setup link. New plans combine required templates, role steps and policy-based suggestions. With Groq enabled the model suggests optional actions with policy references. HR edits descriptions, deadlines, review decisions and eligible assignees before approving the complete plan. HR can add draft steps to one hire or every current hire. Existing active work survives the migration.

HR dashboard cards open filtered directories or task lists. HR can review documents, monitor deadlines, resolve issues, inspect history and preview location changes. Escalation views derive current alerts from deadlines and blockers. Support routing follows category rules. Optional model triage is advisory. Deadline reminders are generated when the employee workspace loads and deduplicated by employee, task and deadline.

## Retrieval and delivery

Express derives the employee identity from the signed cookie and filters the policy corpus by role, department, office, approval and processing status. FastAPI scores LangChain chunks against the question. Vectors and versioned policy text live in the existing PostgreSQL database. The default local encoder uses normalized token matching in a hashed vector space. For semantic model embeddings, set `EMBEDDINGS_URL` to an OpenAI-compatible embeddings endpoint plus `EMBEDDINGS_MODEL` and `EMBEDDINGS_KEY`, then reindex policies. No separate vector database is required. PostgreSQL text search is the degraded retrieval path if FastAPI is unavailable.

LangChain and Groq can phrase responses from approved evidence. Express validates citations and also answers from live task facts. Missing evidence offers an explicit HR handoff. Configure external model services only when the content is suitable for that provider. Raw employee document uploads are stored privately in PostgreSQL and downloaded through authorized routes.

For real mail, set `SMTP_URL` and `MAIL_FROM`. Development captures email in the ignored local outbox when SMTP is absent. Production reports invitation delivery failures to HR and supports resending. Reset tokens expire, are stored hashed and invalidate older sessions when used. Configure a common secret for Express and FastAPI when using a separate retrieval host. [API contract](docs/openapi.json)

## Tests and measured results

The local database helper creates a separate `joinflow_test` database. Each test run creates a unique schema there, applies the committed migration, seeds synthetic data, and removes that run’s schema on exit.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

On a machine with Chrome installed, setting `PLAYWRIGHT_CHANNEL=chrome` uses that browser instead. The browser test starts the compiled server on loopback port 4179.

| Check | Observed local result |
| --- | --- |
| Expected policy citation present | 6 / 6 |
| Expected current task or blocker evidence present | 6 / 6 |
| Unsupported questions offer an HR handoff | 4 / 4 |
| Access-boundary prompts declined | 4 / 4 |
| Median API latency across the 20 questions | 8.4 ms in the original recorded prototype (evidence-only mode). The test runner prints the current median. |
| Forced inference timeout | Checklist evidence and blocker owner returned |
| Unknown model citation | Generated answer discarded and direct evidence returned |
| Concurrent identical approvals | One audit event, workstation setup unlocked |
| Integration suite | 12 / 12 passed against PostgreSQL and FastAPI |
| PDF extraction and retrieval | 2 / 2 Python tests passed |
| Browser journeys | 4 / 4 passed in Chrome, covering manager approval, HR handoff, hire creation, office moves, policy publication, navigation and document review |

The fixed questions and expected outcomes are versioned. These checks measure retrieval and workflow behavior for the demo cases. Hosted-model quality and production latency require a separate run with service credentials. [Evaluation questions](tests/questions.json)

## Reset a disposable demo

`npm run db:seed` adds missing seed accounts and templates while preserving existing hires’ progress. For a fresh demonstration, point `DATABASE_URL` at an empty database or schema and run migrations and seed again. To erase an existing **disposable demo database**, verify its connection URL, run `npx prisma migrate reset --skip-seed`, confirm Prisma’s prompt, then run `npm run db:seed`. Reset deletes that schema’s records.

## Prototype scope

Equipment, payroll, training, and identity actions are simulated. The prototype uses local password accounts and synthetic policies. A pilot could connect an identity provider and equipment system, measure time to unblock hires, and compare routine HR follow-ups per hire. Business impact has not been measured.




