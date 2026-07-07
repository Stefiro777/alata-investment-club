// Token codemod — replaces hardcoded Tailwind color/duration classes with design-system tokens.
// Run: node scripts/codemod-tokens.mjs
import { readdirSync, readFileSync, writeFileSync, statSync } from 'fs'
import { join, extname } from 'path'

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')

// Order matters: longer / more-specific patterns first to prevent partial replacement.
const replacements = [
  // Colors — variant-prefixed forms first, then bare utilities.
  // Tailwind v4 @theme tokens support opacity modifiers, so bg-forest/10 works.
  [/\bgroup-hover:text-\[#1a4a3a\]/g,     'group-hover:text-forest'],
  [/\bgroup-hover:bg-\[#1a4a3a\]/g,       'group-hover:bg-forest'],
  [/\bhover:bg-\[#1a4a3a\]\/(\d+)/g,      'hover:bg-forest/$1'],
  [/\bhover:bg-\[#1a4a3a\]/g,             'hover:bg-forest'],
  [/\bhover:bg-\[#123a2d\]/g,             'hover:bg-forest-deep'],
  [/\bhover:border-\[#1a4a3a\]/g,         'hover:border-forest'],
  [/\bhover:text-\[#1a4a3a\]/g,           'hover:text-forest'],
  [/\bfocus:border-\[#1a4a3a\]/g,         'focus:border-forest'],
  [/\bfocus:ring-\[#1a4a3a\]/g,           'focus:ring-forest'],
  [/\bfile:bg-\[#1a4a3a\]/g,              'file:bg-forest'],
  [/\bbg-\[#1a4a3a\]\/(\d+)/g,            'bg-forest/$1'],
  [/\bbg-\[#1a4a3a\](?!\/)/g,             'bg-forest'],
  [/\btext-\[#1a4a3a\]/g,                 'text-forest'],
  [/\bborder-\[#1a4a3a\]\/(\d+)/g,        'border-forest/$1'],
  [/\bborder-\[#1a4a3a\](?!\/)/g,         'border-forest'],
  [/\bborder-l-\[#1a4a3a\]/g,             'border-l-forest'],
  [/\bborder-t-\[#1a4a3a\]/g,             'border-t-forest'],
  [/\bring-\[#1a4a3a\]/g,                 'ring-forest'],
  [/\baccent-\[#1a4a3a\]/g,               'accent-forest'],
  [/\btext-\[#0a0a0a\]/g,                 'text-ink-900'],
  [/\btext-\[#1f2937\]/g,                 'text-ink-700'],
  [/\btext-\[#6b7280\]/g,                 'text-ink-500'],
  [/\btext-\[#9ca3af\]/g,                 'text-ink-400'],
  [/\btext-\[#d1d5db\]/g,                 'text-ink-300'],
  [/\bplaceholder-\[#d1d5db\]/g,          'placeholder-ink-300'],
  [/\bbg-\[#f5f5f5\](?!\/)/g,             'bg-paper-stone'],
  [/\bbg-\[#fafafa\](?!\/)/g,             'bg-paper-cool'],
  [/\bbg-\[#fafaf7\](?!\/)/g,             'bg-paper-warm'],
  [/\bborder-\[#e5e5e5\]/g,               'border-line'],
  [/\bborder-black\/10\b/g,               'border-line-faint'],
  // Transition durations
  [/transition-colors duration-150\b/g,   'transition-colors duration-fast'],
  [/transition-colors duration-200\b/g,   'transition-colors duration-fast'],
  [/transition-all duration-200\b/g,      'transition-all duration-fast'],
  [/transition-all duration-300\b/g,      'transition-all duration-base'],
]

// Inline-style object values (e.g. { backgroundColor: '#1a4a3a' }) — .tsx only,
// never in app/api (email HTML must keep literal inline colors) and never in
// SVG presentation attributes (fill="#1a4a3a"), which don't support var().
const inlineStyleReplacements = [
  [/:(\s*)'#1a4a3a'/g, ":$1'var(--forest)'"],
]

function walkFiles(dir, exts, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
      walkFiles(full, exts, out)
    } else if (exts.includes(extname(entry))) {
      out.push(full)
    }
  }
  return out
}

const files = [
  ...walkFiles(join(ROOT, 'app'), ['.ts', '.tsx']),
  ...walkFiles(join(ROOT, 'components'), ['.ts', '.tsx']),
]

let totalFiles = 0
let totalChanges = 0

for (const file of files) {
  const original = readFileSync(file, 'utf8')
  let content = original

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement)
  }

  const rel = file.replace(ROOT, '').replace(/\\/g, '/')
  const isEmailTerritory = rel.includes('app/api/') || rel.includes('lib/')
  if (extname(file) === '.tsx' && !isEmailTerritory) {
    for (const [pattern, replacement] of inlineStyleReplacements) {
      content = content.replace(pattern, replacement)
    }
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8')
    totalFiles++
    // count approximate changes
    const changes = replacements.reduce((acc, [p, r]) => {
      const matches = original.match(new RegExp(p.source, p.flags))
      return acc + (matches ? matches.length : 0)
    }, 0)
    totalChanges += changes
    console.log(`  patched: ${file.replace(ROOT, '')}`)
  }
}

console.log(`\nDone. ${totalFiles} file(s) modified, ~${totalChanges} substitution(s).`)
