import { spawnSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { PrismaClient } from '@prisma/client'
const browser = process.argv.includes('--browser')
const url = new URL(
  process.env.TEST_DATABASE_URL ||
    'postgresql://joinflow:local-demo@127.0.0.1:55439/joinflow_test'
)
const schema = 'test_' + randomUUID().replaceAll('-', '')
url.searchParams.set('schema', schema)
Object.assign(process.env, {
  DATABASE_URL: url.href,
  JWT_SECRET: 'temporary-test-secret-only-for-tests-12345',
  DEMO_PASSWORD: 'WelcomeDemo123!',
  APP_ORIGIN: 'http://127.0.0.1:4179',
  PORT: '4179',
  LOG_LEVEL: 'silent',
  NODE_ENV: 'test',
  GROQ_API_KEY: '',
})
const db = new PrismaClient()
function run(args) {
  const r = spawnSync(process.execPath, args, { stdio: 'inherit' })
  if (r.status !== 0) throw Error('Failed: ' + args.join(' '))
}
try {
  run(['node_modules/prisma/build/index.js', 'migrate', 'deploy'])
  run(['prisma/seed.js'])
  run(
    browser
      ? ['node_modules/@playwright/test/cli.js', 'test']
      : ['node_modules/vitest/vitest.mjs', 'run']
  )
} finally {
  // The schema identifier is generated here and contains only a prefix and hex digits.
  await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS "' + schema + '" CASCADE')
  await db.$disconnect()
}
