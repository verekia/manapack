import { FlatcRunner } from 'flatc-wasm'
// Writes the TypeScript that flatc generates from messages.fbs into the folder given as argument
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const out = process.argv[2]
const flatc = await FlatcRunner.init()
const files = flatc.generateCode(
  {
    entry: '/messages.fbs',
    files: { '/messages.fbs': readFileSync(new URL('./messages.fbs', import.meta.url), 'utf8') },
  },
  'ts',
  { genObjectApi: true },
)
for (const [path, source] of Object.entries(files)) {
  mkdirSync(dirname(`${out}/${path}`), { recursive: true })
  writeFileSync(`${out}/${path}`, source)
}
console.log(`${flatc.version()}: ${Object.keys(files).length} files`)
