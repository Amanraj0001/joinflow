import { spawn } from 'node:child_process'
const children = [
  ['--watch', '--env-file-if-exists=.env', 'server/index.js'],
  ['node_modules/vite/bin/vite.js'],
].map((args) => spawn(process.execPath, args, { stdio: 'inherit' }))
let stopping = false
function stop(code) {
  if (stopping) return
  stopping = true
  for (const child of children) child.kill()
  process.exit(code)
}
for (const child of children) child.on('exit', (code) => stop(code || 0))
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))
