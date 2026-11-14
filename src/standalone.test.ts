import { Glob } from 'bun'
import { expect, test } from 'bun:test'

test('the package imports nothing but its own files', async () => {
  const outside: string[] = []
  for await (const file of new Glob('**/*.ts').scan(import.meta.dir)) {
    const source = await Bun.file(`${import.meta.dir}/${file}`).text()
    for (const [, path] of source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)) {
      const ofTheRunner = file.endsWith('.test.ts') && (path === 'bun' || path === 'bun:test')
      if (!path!.startsWith('.') && !ofTheRunner) outside.push(`${file}: ${path}`)
    }
  }
  expect(outside).toEqual([])
})
