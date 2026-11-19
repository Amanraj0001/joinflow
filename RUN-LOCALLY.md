# Run JoinFlow locally on Windows

Use Node.js 24 and two PowerShell terminals. If you already set up this project, start at step 1.

## First-time setup for a fresh clone

From the project folder, install the dependencies and create your local environment file.

```powershell
npm.cmd ci
Copy-Item .env.example .env
```

Keep your existing `.env` when restarting the app. The example settings use local PostgreSQL and allow the chatbot to answer from checklist facts and policy passages without an API key.

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
