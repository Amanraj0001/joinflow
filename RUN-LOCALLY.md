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

Run `npm.cmd ci` to install the mail dependency. Create the Python virtual environment and install the requirements shown above once. Keep your existing `.env`. Apply migrations in step 2 before starting the app.

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
- Use **Request staff access** on the sign-in screen to register an HR or manager account. An existing manager approves it in **Access & roles**.
- As manager, use **Policies** to add text or a readable PDF. After processing shows **Ready**, ask an employee question about that policy in **AI Assistant**. Set job, department or office scope to limit who can retrieve it.
- For actual email delivery set `SMTP_URL` and a verified `MAIL_FROM`. The Node supervisor launches the internal retrieval service on loopback port 8010 together with the API and client.
