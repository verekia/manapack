// Turns results.json into the tables of bench/README.md and of the benchmark section of the root README.
import { readFileSync, writeFileSync } from 'node:fs'

const here = new URL('.', import.meta.url).pathname
const { date, machine, runtimes, rows } = JSON.parse(readFileSync(`${here}results.json`, 'utf8'))

const TITLES = {
  update: 'A state update: what changed in one tick, 14 entities on average',
  snapshot: 'A snapshot: everything about 32 entities',
  input: 'A client input',
}
const RUNTIME_NAMES = { node: 'Node', bun: 'Bun' }

const time = ns =>
  ns === undefined ? '' : ns >= 9950 ? `${(ns / 1000).toFixed(1)} µs` : `${(ns / 1000).toFixed(2)} µs`
const size = bytes => (bytes === undefined ? '' : `${Math.round(bytes).toLocaleString('en-US')} B`)

const table = workload => {
  const of = rows.filter(row => row.workload === workload && !row.skipped && !row.error)
  const adapters = [...new Set(of.map(row => row.adapter))]
  const lines = adapters
    .map(adapter => {
      const by = Object.fromEntries(of.filter(row => row.adapter === adapter).map(row => [row.runtime, row]))
      const any = Object.values(by)[0]
      return { any, by }
    })
    .sort((a, b) => a.any.bytes - b.any.bytes || a.any.name.localeCompare(b.any.name))
    .map(({ any, by }) => {
      const label = any.name.startsWith('manapack') ? `**${any.name}**` : any.name
      const cells = Object.keys(runtimes).flatMap(runtime => [time(by[runtime]?.encodeNs), time(by[runtime]?.decodeNs)])
      return `| ${[label, any.kind === 'schema' ? 'yes' : 'no', size(any.bytes), ...cells].join(' | ')} |`
    })
  const heads = Object.keys(runtimes).flatMap(runtime => [
    `${RUNTIME_NAMES[runtime]} write`,
    `${RUNTIME_NAMES[runtime]} read`,
  ])
  return [
    `| ${['Library', 'Schema', 'Size', ...heads].join(' | ')} |`,
    `| ${['---', '---', '---:', ...heads.map(() => '---:')].join(' | ')} |`,
    ...lines,
  ].join('\n')
}

const versions = () => {
  const seen = new Map()
  for (const row of rows) if (!row.error && !seen.has(row.adapter)) seen.set(row.adapter, row)
  return [...seen.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(row => `| ${row.name} | ${row.version} | ${row.notes} |`)
    .join('\n')
}

const environment = `${Object.entries(runtimes)
  .map(([runtime, version]) => `${RUNTIME_NAMES[runtime]} ${version}`)
  .join(' and ')}, ${machine}, ${date}`

const failed = rows.filter(row => row.error)

writeFileSync(
  `${here}RESULTS.md`,
  `# Benchmark results

${environment}. Run it with \`bun run bench\` from the root of the repository.

${Object.keys(TITLES)
  .map(workload => `## ${TITLES[workload]}\n\n${table(workload)}`)
  .join('\n\n')}

## Libraries

| Library | Version | How it is used |
| --- | --- | --- |
${versions()}
${failed.length ? `\n## Failed\n\n${failed.map(row => `- ${row.adapter} on ${row.workload} (${row.runtime}): ${row.error}`).join('\n')}\n` : ''}`,
)

const START = '<!-- bench:start -->'
const END = '<!-- bench:end -->'
const readmePath = `${here}../README.md`
const readme = readFileSync(readmePath, 'utf8')
if (readme.includes(START) && readme.includes(END)) {
  const section = `${START}\n\n${table('update')}\n\n${environment}.\n\n${END}`
  writeFileSync(
    readmePath,
    readme.slice(0, readme.indexOf(START)) + section + readme.slice(readme.indexOf(END) + END.length),
  )
}
console.log(`RESULTS.md written: ${rows.length - failed.length} results, ${failed.length} failed`)
