#!/usr/bin/env node
// Moves the alumni company logos to our own storage as transparent PNGs.
//
// Why: Brandfetch refuses hotlinks (302 to its docs page), so those logos never show,
// and logos with an opaque white or dark background turn into rectangles on the
// green logo band (filter: brightness(0) invert(1)).
//
//   node --env-file=.env.local scripts/alumni-logos-to-storage.mjs                 # dry run
//   node --env-file=.env.local scripts/alumni-logos-to-storage.mjs --apply         # uploads + updates logo_url
//
// Options:
//   --out <dir>        where the processed PNGs are written for review (default ./alumni-logos-out)
//   --from-dir <dir>   files named "<company name>.png|jpg|jpeg|svg|webp" that replace the logo of that
//                      company (use this for the Brandfetch ones, which cannot be downloaded)
//
// Dry run: reads the table and the public files, writes only to --out, and prints a report.
// --apply: uploads <slug>.png to the alumni-logos bucket (new file names, nothing is overwritten
// or deleted) and sets alumni_companies.logo_url by id. The previous URL is printed so a rollback
// is a single UPDATE. SVGs and logos that already have transparency are kept as they are.

import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const apply = args.includes('--apply')
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def }
const outDir = opt('--out', './alumni-logos-out')
const fromDir = opt('--from-dir', null)

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const BUCKET = 'alumni-logos'
const slug = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/** Removes a uniform background: pixels close to the corner colour become transparent (soft edge). */
async function keyOutBackground(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const px = (x, y) => { const i = (y * w + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]] }
  const corners = [px(0, 0), px(w - 1, 0), px(0, h - 1), px(w - 1, h - 1)]
  const bg = [0, 1, 2].map(c => Math.round(corners.reduce((s, p) => s + p[c], 0) / 4))
  const spread = Math.max(...[0, 1, 2].map(c => Math.max(...corners.map(p => p[c])) - Math.min(...corners.map(p => p[c]))))
  if (spread > 40) return { buffer: null, reason: 'corners differ, background is not uniform' }
  const LOW = 28, HIGH = 80 // below LOW: fully transparent; above HIGH: fully opaque
  for (let i = 0; i < data.length; i += 4) {
    const d = Math.max(Math.abs(data[i] - bg[0]), Math.abs(data[i + 1] - bg[1]), Math.abs(data[i + 2] - bg[2]))
    const a = d <= LOW ? 0 : d >= HIGH ? 255 : Math.round(((d - LOW) / (HIGH - LOW)) * 255)
    data[i + 3] = Math.min(data[i + 3], a)
  }
  const buffer = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).trim().resize({ width: 600, height: 240, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
  return { buffer, reason: `background rgb(${bg.join(',')}) removed` }
}

async function hasTransparency(input) {
  const { data } = await sharp(input).ensureAlpha().resize(120, 120, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true })
  let clear = 0
  for (let i = 3; i < data.length; i += 4) if (data[i] < 128) clear++
  return clear / (data.length / 4) > 0.05
}

async function download(url) {
  const res = await fetch(url, { redirect: 'manual', headers: { Referer: 'https://alatainvestmentclub.com/' } })
  if (res.status >= 300 && res.status < 400) return { error: `redirected to ${res.headers.get('location')}` }
  if (!res.ok) return { error: `HTTP ${res.status}` }
  const type = res.headers.get('content-type') ?? ''
  if (!type.startsWith('image/')) return { error: `not an image (${type})` }
  return { buffer: Buffer.from(await res.arrayBuffer()), type }
}

function manualFile(name) {
  if (!fromDir) return null
  const want = slug(name)
  const f = fs.readdirSync(fromDir).find(x => slug(path.parse(x).name) === want)
  return f ? path.join(fromDir, f) : null
}

const { data: rows, error } = await supabase.from('alumni_companies').select('id, name, logo_url').order('name')
if (error) { console.error(error.message); process.exit(1) }
fs.mkdirSync(outDir, { recursive: true })

const report = { ok: [], kept: [], manual: [], failed: [] }
const sql = []

for (const row of rows) {
  const label = row.name
  const ownStorage = row.logo_url.includes(`/${BUCKET}/`)
  const manual = manualFile(row.name)
  let source, type
  if (manual) {
    source = fs.readFileSync(manual)
    type = manual.toLowerCase().endsWith('.svg') ? 'image/svg+xml' : 'image/*'
  } else {
    const got = await download(row.logo_url)
    if (got.error) { report.manual.push(`${label}: ${got.error}. Provide a file named "${label}.png" via --from-dir`); continue }
    source = got.buffer; type = got.type
  }

  if (type.includes('svg')) {
    if (ownStorage && !manual) { report.kept.push(`${label}: SVG already in storage`); continue }
    const svgName = `${slug(label)}-${Date.now()}.svg`
    fs.writeFileSync(path.join(outDir, svgName), source)
    report.ok.push({ row, file: svgName, buffer: source, contentType: 'image/svg+xml', note: 'SVG as is' })
    continue
  }

  let png, note
  if (await hasTransparency(source)) {
    png = await sharp(source).trim().resize({ width: 600, height: 240, fit: 'inside', withoutEnlargement: true }).png().toBuffer()
    note = 'already transparent, re-saved as PNG'
    if (ownStorage && !manual) { report.kept.push(`${label}: already transparent`); continue }
  } else {
    const keyed = await keyOutBackground(source)
    if (!keyed.buffer) { report.failed.push(`${label}: ${keyed.reason}. Provide a transparent file via --from-dir`); continue }
    png = keyed.buffer; note = keyed.reason
  }
  const file = `${slug(label)}-${Date.now()}.png`
  fs.writeFileSync(path.join(outDir, file), png)
  report.ok.push({ row, file, buffer: png, contentType: 'image/png', note })
}

for (const r of report.ok) console.log(`OK      ${r.row.name}: ${r.note} -> ${r.file}`)
for (const m of report.kept) console.log(`KEPT    ${m}`)
for (const m of report.manual) console.log(`MANUAL  ${m}`)
for (const m of report.failed) console.log(`FAILED  ${m}`)
console.log(`\n${report.ok.length} processed, ${report.kept.length} kept, ${report.manual.length} need a file, ${report.failed.length} failed. PNGs for review in ${path.resolve(outDir)}`)

if (!apply) { console.log('Dry run: nothing was uploaded. Re-run with --apply to upload and update logo_url.'); process.exit(0) }

for (const r of report.ok) {
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(r.file, r.buffer, { contentType: r.contentType, upsert: false })
  if (upErr) { console.error(`UPLOAD FAILED ${r.row.name}: ${upErr.message}`); continue }
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(r.file)
  const { error: dbErr } = await supabase.from('alumni_companies').update({ logo_url: publicUrl }).eq('id', r.row.id)
  if (dbErr) { console.error(`UPDATE FAILED ${r.row.name}: ${dbErr.message}`); continue }
  sql.push(`update alumni_companies set logo_url = '${r.row.logo_url.replace(/'/g, "''")}' where id = '${r.row.id}'; -- rollback ${r.row.name}`)
  console.log(`UPDATED ${r.row.name} -> ${publicUrl}`)
}
if (sql.length) console.log('\nRollback SQL:\n' + sql.join('\n'))
