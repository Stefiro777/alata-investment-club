import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * A Server Component cannot call a function (or read a value) exported from a 'use client'
 * file: Next hands it a client reference and throws at request time, when `tsc` and
 * `next build` have both passed. This is what broke /admin/finance (isFinanceTab).
 *
 * Rule checked here: a file under app/ without 'use client' may import from a 'use client'
 * file only components and types (names starting with a capital letter, or `type` imports).
 */

const root = process.cwd()
const SKIP = new Set(['node_modules', '.next', '.git'])

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p)
  }
  return out
}

const isClientFile = (src: string) => /^\s*(\/\*[\s\S]*?\*\/\s*|\/\/.*\n\s*)*['"]use client['"]/.test(src)

function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : spec.startsWith('.') ? path.resolve(path.dirname(from), spec) : null
  if (!base) return null
  for (const ext of ['', '.ts', '.tsx', '/index.ts', '/index.tsx']) {
    const p = base + ext
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p
  }
  return null
}

/** The named, non-type values imported by a statement: `import A, { b, type C, D as E } from …` → ['b', 'D']. */
export function namedValueImports(clause: string): string[] {
  const m = clause.match(/\{([\s\S]*)\}/)
  if (!m) return []
  return m[1]
    .split(',')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('type '))
    .map(s => s.split(/\s+as\s+/)[0].trim())
}

test('the import reader keeps values and drops types and aliases', () => {
  assert.deepEqual(namedValueImports('FinanceClient, { isFinanceTab, type FinanceTab }'), ['isFinanceTab'])
  assert.deepEqual(namedValueImports('{ Section as S, Row }'), ['Section', 'Row'])
  assert.deepEqual(namedValueImports('Default'), [])
})

test('no Server Component in app/ imports a function or value from a client file', () => {
  const clientCache = new Map<string, boolean>()
  const isClient = (f: string) => {
    if (!clientCache.has(f)) clientCache.set(f, isClientFile(fs.readFileSync(f, 'utf8')))
    return clientCache.get(f)!
  }

  const offenders: string[] = []
  for (const file of walk(path.join(root, 'app'))) {
    if (isClient(file)) continue
    const src = fs.readFileSync(file, 'utf8')
    const re = /import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) {
      if (/^type\s/.test(m[1].trim())) continue
      const target = resolveImport(file, m[2])
      if (!target || !isClient(target)) continue
      for (const name of namedValueImports(m[1])) {
        if (!/^[A-Z]/.test(name)) offenders.push(`${path.relative(root, file)} imports ${name} from ${path.relative(root, target)}`)
      }
    }
  }
  assert.deepEqual(offenders, [], 'Move these to a file without "use client" (for example in lib/):\n' + offenders.join('\n'))
})
