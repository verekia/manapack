// Runs every adapter on every workload, each in a process of its own, on Node and on Bun, then writes the tables.
//   node run.mjs [--runtimes=node,bun] [--only=manapack,msgpackr] [--workloads=update]
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus } from 'node:os'

import { WORKLOADS } from './workloads.mjs'

const option = name =>
  process.argv
    .find(argument => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3)
    .split(',')

const here = new URL('.', import.meta.url).pathname
if (!existsSync(`${here}../library/dist/index.js`)) {
  console.error('Build the library first: bun run build')
  process.exit(1)
}

const only = option('only')
const adapters = readdirSync(`${here}adapters`)
  .filter(file => file.endsWith('.mjs'))
  .map(file => file.slice(0, -4))
  .filter(adapter => !only || only.includes(adapter))
  .sort()
const runtimes = (option('runtimes') ?? ['node', 'bun']).filter(runtime => {
  const found = spawnSync(runtime, ['--version']).status === 0
  if (!found) console.error(`${runtime} is not installed: skipped`)
  return found
})
const selected = option('workloads') ?? WORKLOADS

const resultsPath = `${here}results.json`
const previous = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')).rows : []
const rows = previous.filter(
  row => !(adapters.includes(row.adapter) && runtimes.includes(row.runtime) && selected.includes(row.workload)),
)

for (const runtime of runtimes) {
  for (const adapter of adapters) {
    for (const workload of selected) {
      const run = spawnSync(runtime, ['harness.mjs', adapter, workload], { cwd: here, encoding: 'utf8', timeout: 120_000 })
      const line = run.stdout?.trim().split('\n').at(-1)
      let row
      try {
        row = JSON.parse(line)
      } catch {
        row = { adapter, workload, runtime, error: (run.stderr || run.error?.message || 'no output').trim().split('\n')[0] }
      }
      rows.push(row)
      const outcome = row.error
        ? `FAILED ${row.error}`
        : row.skipped
          ? 'skipped'
          : `${row.bytes.toFixed(1)} B, write ${Math.round(row.encodeNs)} ns, read ${Math.round(row.decodeNs)} ns`
      console.log(`${runtime.padEnd(5)} ${adapter.padEnd(28)} ${workload.padEnd(9)} ${outcome}`)
    }
  }
}

const versionOf = runtime => spawnSync(runtime, ['--version'], { encoding: 'utf8' }).stdout.trim().replace(/^v/, '')
writeFileSync(
  resultsPath,
  `${JSON.stringify(
    {
      date: new Date().toISOString().slice(0, 10),
      machine: `${cpus()[0].model.trim()}, ${cpus().length} cores, ${process.platform} ${process.arch}`,
      runtimes: Object.fromEntries(['node', 'bun'].filter(r => rows.some(row => row.runtime === r)).map(r => [r, versionOf(r)])),
      rows,
    },
    null,
    2,
  )}\n`,
)
spawnSync(process.execPath, ['report.mjs'], { cwd: here, stdio: 'inherit' })
