# Run JoinFlow locally on Windows

Use Node.js 24, Python 3.12 or newer, and two PowerShell terminals. For an existing installation, follow the upgrade instructions below once before restarting.

## First-time setup for a fresh clone

From the project folder, install the dependencies and create your local environment file.

```powershell
npm.cmd ci
python -m venv .local/rag-env
& .local/rag-env/Scripts/python.exe -m pip install -r services/rag/requirements.txt
Copy-Item .env.example .env
```

Keep your existing `.env` when restarting the app. The example settings use local PostgreSQL and allow the chatbot to answer from checklist facts and policy passages without an API key.

## Upgrading an existing checkout

Run `npm.cmd ci` to install the mail dependency. Create the Python virtual environment and install the requirements shown above once. Keep your existing `.env`. With PostgreSQL running, apply the migration in step 2 and run `npm.cmd run build` once to refresh the Prisma client. The migration preserves existing records. HR can use **Retry extraction** to analyze older submissions.

## 1. Start PostgreSQL

In the first terminal, run the following commands. If you cloned the project elsewhere, substitute your folder path.

```powershell
cd C:\Users\rajam\Downloads\dayforce
npm.cmd run db:local
```

Wait for `Local PostgreSQL ready` and leave this terminal open.

## 2. Start JoinFlow

In the second terminal, run the following commands.

```powershell
cd C:\Users\rajam\Downloads\dayforce
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run dev
```

Migration and seed are safe to repeat and preserve existing demo progress. Leave this terminal open while using the app.

## 3. Sign in

Open [JoinFlow on localhost](http://localhost:5173). Use this exact address so it matches the configured browser origin. With the example settings, all three accounts use the password `WelcomeDemo123!`.

| Role | Email |
| --- | --- |
| Employee | `alex@joinflow.example` |
| Manager | `sam@joinflow.example` |
| HR | `ellis@joinflow.example` |

## Optional hosted chatbot answers

Set `GROQ_API_KEY` in your local `.env` file. Restart `npm.cmd run dev` in the second terminal to load the key.

## Stop the app

Press **Ctrl+C** in the app terminal, then in the PostgreSQL terminal. Your local database persists for the next run.

## Test the new workflows

- Sign in as HR, open **New hire**, and enter the work email, personal email, role, department, manager, office, and joining date. Open **Plans**, choose the new hire, review their tasks, and select **Approve onboarding plan**.
- The employee receives their work login and a single-use setup link at their personal address. Without SMTP in development, open the newest matching JSON file under `.local/mail/` and copy the link from its text. This ignored directory contains private links.
- Select **HR** or **Manager** on the sign-in screen, then choose **Sign up as HR** or **Sign up as Manager**. An existing manager reviews the request under **Access & roles → Staff registrations**. Once approved, the new staff member can sign in with their work email and password. Employees sign in with accounts created by HR.
- As manager, use **Policies** to add text or a readable PDF. After processing shows **Ready**, ask an employee question about that policy in **AI Assistant**. Set job, department or office scope to limit who can retrieve it.
- For actual email delivery set `SMTP_URL` and a verified `MAIL_FROM`. The Node supervisor launches the internal retrieval service on loopback port 8010 together with the API and client.

## Three-account walkthrough

For an existing installation with the update already built and migrated, start PostgreSQL in terminal 1 and run `npm.cmd run dev` in terminal 2. For a fresh clone or a checkout you just updated, complete the setup above first.

Open three separate browser profiles, or use Chrome, Edge and Firefox. Sign in as Alex, Ellis and Sam using the accounts in step 3. Ordinary tabs in one profile share the same login. After an action in one portal, use **Refresh** in the other portal to load the change. If you previously changed a demo password, use its current password. Seeding creates missing users and preserves existing passwords.

### 1. Follow a task from employee to manager and back

1. **Alex (Employee)** — Open **Dashboard** and click **Pending**. In **My Tasks**, open **Set up your workstation**. On a fresh demo it shows **Blocked** and names the laptop approval it needs.
2. **Sam (Manager)** — Open **Decisions**, find Alex Park’s **Approve laptop request**, and select **Approve**.
3. **Alex** — Refresh **My Tasks**. Workstation setup should now be **Available**. Open it, choose **Start task**, then **Mark complete**. Expand **Completed tasks** to see the result. Return to the dashboard and check the completion count.
4. If Alex’s approval was already decided during an earlier demo, use another pending hire in Sam’s queue and sign in as that employee. The other seeded employees are Maya Chen (`maya@joinflow.example`) and Noah Lane (`noah@joinflow.example`).

### 2. Submit evidence and verify it as HR

1. **Alex** — Open **My Tasks → Review identity documents**. Before approval, **View required evidence** takes you to **My Documents**.
2. Under **Identity document**, upload a small PDF with selectable text containing “Identity document” and “Alex Park”. Use fictional details. A PDF exported from a text editor works for this demo. The limit is 5 MB.
3. **Ellis (HR)** — Open **Documents** and find Alex’s submission. Expand **Preview original PDF** and **Assisted review**. Inspect the extracted text and observations. A scanned page can require manual inspection.
4. Choose **Resubmission Required**, enter “Please include the second page”, and select **Submit review**. **Alex** should now see that reason in **My Documents** and an update in **Notifications**.
5. **Alex** — Select **Replace document** and submit a corrected PDF. **Ellis** — Refresh and approve the replacement. **Alex** — Refresh **My Tasks** and complete the identity task. If Alex already has an approved identity document, use another seeded employee with an outstanding submission for this exercise.

### 3. Publish a policy and ask the assistant about it

1. **Sam** — Open **Policies → New policy**. Enter the title “Demo bicycle storage” and policy text “Employees store bicycles in the orchid courtyard.” Leave the scope fields blank for company-wide access, select Sam as owner and choose **Add policy**. Wait for **Ready**.
2. **Alex** — Open **AI Assistant** and ask “Where do employees store bicycles?” Look for **orchid courtyard** and expand the policy reference. Ask “Tell me more about that”, then leave and reopen the assistant to check conversation history.
3. **Ellis** — In **Policies**, expand the demo policy and suggest “The courtyard opens at 8 AM.” **Sam** — Refresh **Policies**, approve the suggestion under **HR policy suggestions** and confirm publication. Open **Version history** to see the previous edition. **Alex** — Ask a new question about the courtyard opening time.
4. **Alex** — Ask a question missing from your policies, such as “Is relocation covered?” on a freshly seeded database. When the assistant reports insufficient evidence, select **Send question to HR** and confirm. **Ellis** — Open that question in **HR inbox** and reply. **Alex** — Read the reply under **Help & Support → My Requests**.

### 4. Track a support ticket, a notification and a direct message

1. **Alex** — Open **Help & Support → New Request**. Select **Company email**, enter “My work mailbox will not open”, optionally attach a sample PDF and choose **Create request**. Note the ticket ID.
2. **Ellis** — Open **HR inbox**, select Alex’s ticket and route it to **IT**. Choose **Waiting for Employee**, enter “Please try your mailbox again”, and select **Update issue**. Add an **Internal HR note**.
3. **Alex** — Open **Notifications → Unread** and click the ticket update. It should open that ticket, including Ellis’s response. Reply “It works now.” Return to Notifications and open **Read** to find the update. Try **Mark all as read** and refresh to check the unread count.
4. **Ellis** — Refresh the ticket, read Alex’s reply and mark it **Resolved** with a closing response. **Alex** can see the resolution in **My Requests**. The internal note is visible only to HR.
5. **Alex** — Open **Help & Support → Messages**, choose Ellis and send a direct message. **Ellis** — Open **HR inbox → Messages**, choose Alex and reply. Both users should see the exchange in their direct conversation.

### 5. Inspect escalations, filters and plan approval

1. **Ellis** — On **Dashboard**, click **Critical blockers** to open the corresponding tasks. In **Tasks**, filter by employee, department, assignee or status. Click a task and expand **Activity history**.
2. Open **Escalations**. **At-risk Employees** groups work by employee. **Delayed Tasks → Investigate task** opens the task detail. **Support Issues** shows routed tickets. Empty views depend on the current deadlines and progress.
3. **Ellis** — In **Plans → Add onboarding steps**, select Alex, enter a distinctive task title, instructions, department and due date, and choose **Add draft step**. **Alex** — Refresh **My Tasks** and verify the draft is hidden.
4. **Ellis** — Select Alex in **Review onboarding plan**, review the draft and choose **Approve onboarding plan**. **Alex** — Refresh **My Tasks** and look for the new assignment.

## Run the automated checks

With local PostgreSQL running, open another PowerShell terminal in the project folder. The API and browser suites use temporary schemas in `joinflow_test`. The browser suite serves the production build and uses installed Chrome with the setting below.

```powershell
npm.cmd run build
npm.cmd test
$env:PLAYWRIGHT_CHANNEL = 'chrome'
npm.cmd run test:e2e
& .local/rag-env/Scripts/python.exe -m unittest discover -s tests/rag
```
