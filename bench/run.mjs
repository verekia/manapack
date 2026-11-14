// Runs every adapter on every workload, each in a process of its own, on Node and on Bun, and keeps the fastest of
// `--repeat` runs of each. Then it writes BENCH.json and BENCH.md.
//   node run.mjs [--runtimes=node,bun] [--only=manapack,msgpackr] [--workloads=update] [--repeat=3]
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
const repeat = Number(option('repeat')?.[0] ?? 3)

const resultsPath = `${here}../BENCH.json`
const previous = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, 'utf8')) : { rows: [], runtimes: {} }
const keyOf = row => `${row.runtime} ${row.adapter} ${row.workload}`
const rows = new Map(
  previous.rows
    .filter(
      row => !(adapters.includes(row.adapter) && runtimes.includes(row.runtime) && selected.includes(row.workload)),
    )
    .map(row => [keyOf(row), row]),
)

for (let pass = 1; pass <= repeat; pass++) {
  for (const runtime of runtimes) {
    for (const adapter of adapters) {
      for (const workload of selected) {
        const run = spawnSync(runtime, ['harness.mjs', adapter, workload], {
          cwd: here,
          encoding: 'utf8',
          timeout: 180_000,
        })
        let row
        try {
          row = JSON.parse(run.stdout.trim().split('\n').at(-1))
        } catch {
          const error = (run.stderr || run.error?.message || 'no output').trim().split('\n')[0]
          row = { adapter, workload, runtime, error }
        }
        const best = rows.get(keyOf(row))
        if (best && !best.error && !row.error && !row.skipped) {
          row.encodeNs = Math.min(row.encodeNs, best.encodeNs)
          row.decodeNs = Math.min(row.decodeNs, best.decodeNs)
        }
        rows.set(keyOf(row), row)
        const outcome = row.error
          ? `FAILED ${row.error}`
          : row.skipped
            ? 'skipped'
            : `${row.bytes.toFixed(1)} B, write ${Math.round(row.encodeNs)} ns, read ${Math.round(row.decodeNs)} ns`
        console.log(`${pass}/${repeat} ${runtime.padEnd(5)} ${adapter.padEnd(28)} ${workload.padEnd(9)} ${outcome}`)
      }
    }
  }
}

const versionOf = runtime => spawnSync(runtime, ['--version'], { encoding: 'utf8' }).stdout.trim().replace(/^v/, '')
writeFileSync(
  resultsPath,
  `${JSON.stringify(
    {
      date: new Date().toISOString().slice(0, 10),
      cpu: `${cpus()[0]
        .model.replace(/\(R\)|\(TM\)/g, '')
        .replace(/\s+/g, ' ')
        .trim()}, ${cpus().length} cores`,
      repeat: Math.max(repeat, only ? (previous.repeat ?? repeat) : repeat),
      runtimes: { ...previous.runtimes, ...Object.fromEntries(runtimes.map(runtime => [runtime, versionOf(runtime)])) },
      rows: [...rows.values()],
    },
    null,
    2,
  )}\n`,
)
spawnSync(process.execPath, ['benchmd.mjs'], { cwd: here, stdio: 'inherit' })
