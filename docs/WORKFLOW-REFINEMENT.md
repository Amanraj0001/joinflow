# JoinFlow workflow refinement

## Employee experience

The dashboard highlights progress, the next action and upcoming deadlines. My Tasks prioritizes available assignments and groups completed work at the bottom. Staff decisions use the existing approval workflow. An evidence task requires an approved submission for the same employee and document category before completion. HR can select evidence when reviewing a draft step.

Notifications support Unread, Read and All, bulk mark-as-read and links to related work. Assistant conversations persist across sessions. Follow-ups use the preceding topic and fresh scoped records or policy retrieval. Employees confirm before forwarding an unanswered question. My Requests, New Request and Messages separate ticket conversations, creation and direct HR messaging.

## Staff experience

The inbox shows one ticket at a time, with status filters, replies, PDF attachments and internal HR notes. Escalations separate employee risk, delayed tasks and routed support issues. The task register includes filters, a detail panel and collapsed activity history.

Managers can set policy metadata, designate a verified manager as owner, inspect revision snapshots and publish an HR suggestion as an appended, indexed revision. Existing policy editions begin accumulating history with their first edit after migration.

HR can preview a PDF, inspect extracted text and discrepancies, approve it, reject it or request resubmission. Both negative outcomes require feedback. The local PDF reader checks the first 12 pages for identifying text and name matches. Image-only documents require manual inspection. With Groq configured, JoinFlow requests suggested manual checks using document category and local observations. The PDF, extracted excerpt and employee name stay out of that model request.

## Files and APIs

| Area | Files |
| --- | --- |
| New shared ticket interface | apps/web/src/shared/Tickets.jsx |
| Employee and shared views | apps/web/src/employee/{Portal,Employee,Assistant}.jsx, apps/web/src/shared/Messages.jsx, apps/web/src/main.jsx, apps/web/src/style.css |
| Staff views | apps/web/src/staff/{Portal,Plans,Policies,TaskMonitor,EmployeeDirectory,Escalations,DocumentReviews}.jsx |
| Backend | apps/api/src/employee/{services,triage}.js, apps/api/src/knowledge/{assistant,chat,policies}.js, apps/api/src/onboarding/{workflow,plans,routes}.js, apps/api/src/workspace/overview.js |
| Extraction and retrieval service | services/rag/main.py |
| Database | prisma/schema.prisma, prisma/migrations/202611200003_workflow_refinement/migration.sql (new) |
| Verification | tests/{workflows,portals}.test.js, tests/browser/journey.spec.js, tests/rag/test_index.py |
| Documentation | RUN-LOCALLY.md, docs/openapi.json, this file |

The migration adds employee chat turns, task start and evidence fields, task-linked audit entries, ticket attachments and notes, submission observations and policy metadata and revisions. It backfills the evidence category for existing identity tasks.

New Express operations cover conversation history, starting a task, marking all notices read, ticket replies, internal notes, attachment download, PDF preview and extraction retry. Existing chat, handoff, checklist, plan review, ticket, submission and policy operations return or accept the new fields. The internal FastAPI service adds document-review extraction. See the [API specification](openapi.json) for routes and [local setup guide](../RUN-LOCALLY.md) for commands.
