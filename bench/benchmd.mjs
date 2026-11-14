// Renders BENCH.md from BENCH.json, and the tables of the README between its bench markers. run.mjs calls it after a
// run; run it directly to render again:
//
//   node bench/benchmd.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const { date, cpu, repeat, runtimes, rows } = JSON.parse(readFileSync(`${root}BENCH.json`, 'utf8'))

// Times within 5% are called even: the fastest of a few runs still moves by about that much
const NOISE = 0.05
const ENGINES = { node: 'V8', bun: 'JavaScriptCore' }
const RUNTIMES = { node: 'Node', bun: 'Bun' }
const WORKLOADS = {
  update: {
    title: 'A state update',
    text: 'What changed in one tick of 50 ms: 14 entities on average, a few fields of each.',
  },
  snapshot: { title: 'A snapshot', text: 'Everything about 32 entities: what a client is sent when it joins.' },
  input: {
    title: 'A client input',
    text: 'What a client sends 20 times a second: its pose and the abilities it used.',
  },
}
// The rows of the README: the best known formats, the libraries made for games, and the closest ones
const README_ROWS = [
  'json',
  'msgpackr',
  'msgpack-msgpack',
  'cbor-x',
  'protobufjs',
  'protobuf-es',
  'avsc',
  'flatbuffers',
  'bebop',
  'fory',
  'packcat',
  'typed-array-buffer-schema',
  'tinybuf',
  'delta-pack',
  'sia',
  'sirdez',
  'msgpackr-records',
  'cbor-x-records',
  'colyseus-schema',
]

const good = rows.filter(row => !row.error && !row.skipped)
const isOurs = row => row.adapter.startsWith('manapack')
const referenceOf = stateful => (stateful ? 'manapack-state' : 'manapack')
const find = (adapter, workload, runtime) =>
  good.find(row => row.adapter === adapter && row.workload === workload && row.runtime === runtime)

const versus = (mine, other, better, worse, threshold, sign) => {
  const ratio = other / mine
  if (ratio >= 1 + threshold) return `🟢 ${ratio.toFixed(2)}${sign} ${better}`
  if (ratio <= 1 / (1 + threshold)) return `🔴 ${(1 / ratio).toFixed(2)}${sign} ${worse}`
  return '⚪ even'
}
const faster = (mine, other, sign = 'x') => versus(mine, other, 'faster', 'slower', NOISE, sign)
const smaller = (mine, other, sign = 'x') => versus(mine, other, 'smaller', 'larger', 0.005, sign)

const micro = ns => `${(ns / 1000).toFixed(2)} µs`
const size = bytes => `${Math.round(bytes).toLocaleString('en-US')} B`
const lines = (header, align, body) => [
  `| ${header.join(' | ')} |`,
  `| ${align.join(' | ')} |`,
  ...body.map(cells => `| ${cells.join(' | ')} |`),
]

// Plain unpadded rows: oxfmt owns the alignment of the columns
const resultsTable = (workload, runtime, stateful) => {
  const of = good.filter(row => row.workload === workload && row.runtime === runtime && row.stateful === stateful)
  const reference = of.find(row => row.adapter === referenceOf(stateful))
  if (!reference) return []
  const ours = [reference, ...of.filter(row => isOurs(row) && row !== reference)]
  const others = of.filter(row => !isOurs(row)).sort((a, b) => a.bytes - b.bytes || a.name.localeCompare(b.name))
  return lines(
    ['library', 'schema', 'size', 'write', 'read', 'manapack size', 'manapack write', 'manapack read'],
    ['---', '---', '---:', '---:', '---:', '---', '---', '---'],
    [...ours, ...others].map(row => [
      isOurs(row) ? `**${row.name}**` : row.name,
      row.kind === 'schema' ? 'yes' : 'no',
      size(row.bytes),
      micro(row.encodeNs),
      micro(row.decodeNs),
      ...(isOurs(row)
        ? ['', '', '']
        : [
            smaller(reference.bytes, row.bytes),
            faster(reference.encodeNs, row.encodeNs),
            faster(reference.decodeNs, row.decodeNs),
          ]),
    ]),
  )
}

const libraries = () => {
  const seen = new Map()
  for (const row of good) if (!seen.has(row.adapter)) seen.set(row.adapter, row)
  return lines(
    ['library', 'version', 'how it is used'],
    ['---', '---', '---'],
    [...seen.values()].sort((a, b) => a.name.localeCompare(b.name)).map(row => [row.name, row.version, row.notes]),
  )
}

const others = new Set(good.filter(row => !isOurs(row)).map(row => row.adapter))
const failed = rows.filter(row => row.error)

const bench = [
  '# Benchmark results',
  '',
  '<!-- Generated from BENCH.json by bench/benchmd.mjs — do not edit by hand. -->',
  '',
  `The same game messages packed by manapack and by ${others.size} other ways to pack them: libraries with a schema,`,
  'libraries without one, JSON and the serializer of V8. Every library is given the plain objects a game holds, at the',
  'best settings its documentation names, and returns bytes it does not write over. Before anything is timed, each',
  'of the 256 messages of a sequence is written, read back and compared with the original: a whole number exact, a',
  'fraction to 2 mm. A float is a float32 wherever a library has one.',
  '',
  `A size is the average of the 256 messages. A time is the fastest pass over them, each library in a process of its`,
  `own, the best of ${repeat} runs. The last three columns say how manapack compares to the library of the row: 🟢 manapack`,
  `is smaller or faster, 🔴 manapack is larger or slower, ⚪ within ${NOISE * 100}% (run noise).`,
  '',
  'A library that keeps a state per socket needs its messages read in order on one connection: it is compared with',
  'manapack with its socket state, in a table of its own. Any reader takes a message of the other libraries, in any',
  'order: they are compared with manapack without a state.',
  '',
  `- Date: ${date}`,
  ...Object.entries(runtimes).map(([runtime, version]) => `- ${RUNTIMES[runtime]}: ${version} (${ENGINES[runtime]})`),
  `- CPU: ${cpu}`,
  '',
  '`bun run bench` runs it all again.',
  '',
]
for (const [workload, { title, text }] of Object.entries(WORKLOADS)) {
  for (const runtime of Object.keys(runtimes)) {
    bench.push(`## ${title} — ${RUNTIMES[runtime]} (${ENGINES[runtime]})`, '', text, '')
    bench.push('Without a state:', '', ...resultsTable(workload, runtime, false), '')
    const stateful = resultsTable(workload, runtime, true)
    if (stateful.length) bench.push('With a state per socket:', '', ...stateful, '')
  }
}
bench.push('## Libraries', '', ...libraries(), '')
if (failed.length) {
  bench.push(
    '## Failed',
    '',
    ...failed.map(row => `- ${row.adapter}, ${row.workload}, ${row.runtime}: ${row.error}`),
    '',
  )
}
writeFileSync(`${root}BENCH.md`, bench.join('\n'))

// The README: pills only, for the state update
const summary = stateful => {
  const header = ['library', 'size']
  for (const runtime of Object.keys(runtimes)) header.push(`write, ${RUNTIMES[runtime]}`, `read, ${RUNTIMES[runtime]}`)
  const body = README_ROWS.flatMap(adapter => {
    const first = find(adapter, 'update', Object.keys(runtimes)[0])
    if (!first || first.stateful !== stateful) return []
    const cells = [first.name, smaller(find(referenceOf(stateful), 'update', first.runtime).bytes, first.bytes, '×')]
    for (const runtime of Object.keys(runtimes)) {
      const row = find(adapter, 'update', runtime)
      const reference = find(referenceOf(stateful), 'update', runtime)
      cells.push(faster(reference.encodeNs, row.encodeNs, '×'), faster(reference.decodeNs, row.decodeNs, '×'))
    }
    return [cells]
  })
  return lines(
    header,
    header.map(() => '---'),
    body,
  )
}

const START = '<!-- bench:start -->'
const END = '<!-- bench:end -->'
const readmePath = `${root}README.md`
const readme = readFileSync(readmePath, 'utf8')
if (readme.includes(START) && readme.includes(END)) {
  const section = [
    START,
    '',
    `How manapack compares with ${others.size} other ways to pack a state update, what a game server sends 20 times a`,
    'second: 🟢 manapack is smaller or faster, 🔴 manapack is larger or slower, ⚪ within 5%. The sizes, the times, two',
    'more messages and every library are in [BENCH.md](https://github.com/verekia/manapack/blob/main/BENCH.md).',
    '',
    'Any reader, any order, against manapack without a state:',
    '',
    ...summary(false),
    '',
    'Messages read in order on one socket, against manapack with its socket state:',
    '',
    ...summary(true),
    '',
    `${Object.entries(runtimes)
      .map(([runtime, version]) => `${RUNTIMES[runtime]} ${version}`)
      .join(' and ')}, ${cpu}, ${date}. \`bun run bench\` runs it all again.`,
    '',
    END,
  ].join('\n')
  writeFileSync(
    readmePath,
    readme.slice(0, readme.indexOf(START)) + section + readme.slice(readme.indexOf(END) + END.length),
  )
}
console.log(`BENCH.md written: ${good.length} results, ${failed.length} failed`)
