/**
 * `npm run dev`: runs `next dev`, and restarts it whenever the Prisma client
 * is regenerated (after `prisma migrate dev` / `prisma generate`). Next keeps
 * the Prisma client loaded for the life of the process, so without a restart
 * a schema change leaves the server using the old client.
 *
 * Deliberately NOT `node --watch`: that gives the child an IPC channel and
 * watch flags which Next's own worker processes inherit, and their extra
 * messages crash Next's worker pool ("Unexpected response from worker"),
 * breaking every server action. Here `next dev` is spawned as a plain
 * process with nothing inherited but stdio.
 */
import { spawn } from 'node:child_process'
import { watch, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const nextBin = createRequire(import.meta.url).resolve('next/dist/bin/next')
const clientDir = path.join(root, 'node_modules', '.prisma', 'client')
const args = process.argv.slice(2)

let child = null
let restarting = false
let shuttingDown = false

function start() {
  child = spawn(process.execPath, [nextBin, 'dev', ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  child.on('exit', (code, signal) => {
    child = null
    if (shuttingDown) process.exit(code ?? 0)
    if (restarting) {
      restarting = false
      start()
    } else if (signal !== 'SIGTERM') {
      // next dev stopped by itself (a crash, or a port already in use).
      process.exit(code ?? 1)
    }
  })
}

let timer = null
function scheduleRestart() {
  // A single `prisma generate` rewrites many files; restart once, after it settles.
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!child || restarting) return
    console.log('\n[dev] Prisma client regenerated — restarting next dev…\n')
    restarting = true
    child.kill('SIGTERM')
  }, 1500)
}

if (existsSync(clientDir)) {
  watch(clientDir, (_event, file) => {
    if (file === 'schema.prisma' || file === 'index.js') scheduleRestart()
  })
} else {
  console.warn('[dev] node_modules/.prisma/client not found — run `npx prisma generate`. Auto-restart is off.')
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    shuttingDown = true
    if (child) child.kill(signal)
    else process.exit(0)
  })
}

start()
