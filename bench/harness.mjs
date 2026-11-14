// One library on one workload, in a process of its own: checks that every message comes back, then times it.
//   node harness.mjs <adapter> <workload> [--check]
import { readFileSync } from 'node:fs'

import { same, workloads } from './workloads.mjs'

const [adapterName, workloadName, flag] = process.argv.slice(2)
const adapter = await import(`./adapters/${adapterName}.mjs`)
const messages = workloads[workloadName]
const session = adapter.workloads[workloadName]

const versionOf = name => JSON.parse(readFileSync(new URL(`./node_modules/${name}/package.json`, import.meta.url))).version
const report = fields =>
  console.log(
    JSON.stringify({
      adapter: adapterName,
      name: adapter.name,
      kind: adapter.kind,
      version: adapter.pkg ? versionOf(adapter.pkg) : (adapter.version ?? ''),
      notes: adapter.notes ?? '',
      workload: workloadName,
      runtime: typeof Bun === 'undefined' ? 'node' : 'bun',
      ...fields,
    }),
  )

if (!session) {
  report({ skipped: true })
  process.exit(0)
}

// Every message of the sequence is written by one end and read by the other, in order, as on a socket. The bytes
// are kept as they were returned: a library that writes over them fails here.
const writer = session()
const packed = messages.map(message => writer.encode(message))
const reader = session()
let bytes = 0
packed.forEach((data, i) => {
  bytes += data.byteLength
  const read = reader.decode(data)
  const difference = same(reader.view ? reader.view(read) : read, messages[i], `${workloadName}[${i}]`)
  if (difference) {
    console.error(`${adapterName}: ${difference}`)
    process.exit(1)
  }
})

if (flag === '--check') {
  report({ bytes: bytes / messages.length })
  process.exit(0)
}

const now = () => Number(process.hrtime.bigint())
// The fastest pass over the sequence, each on a fresh socket, after `warmMs` of passes and within `runMs` more
const fastest = (pass, warmMs = 400, runMs = 900) => {
  let best = Infinity
  const startedAt = now()
  for (;;) {
    const state = session()
    const t = now()
    pass(state)
    const elapsed = now() - t
    const sinceStart = (t - startedAt) / 1e6
    if (sinceStart > warmMs && elapsed < best) best = elapsed
    if (sinceStart > warmMs + runMs) return best / messages.length
  }
}

let sink = 0
const encodeNs = fastest(state => {
  for (let i = 0; i < messages.length; i++) sink += state.encode(messages[i]).byteLength
})
const decodeNs = fastest(state => {
  for (let i = 0; i < packed.length; i++) sink += state.decode(packed[i]) === undefined ? 0 : 1
})

report({ bytes: bytes / messages.length, encodeNs, decodeNs, sink: sink > 0 })
