import { test } from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { prepareProfilePhoto } from './profile-photo.ts'

/** A photo-like image made on the fly: gradients and noise, so it does not compress to nothing. */
async function sample(width: number, height: number, format: 'jpeg' | 'png' = 'jpeg', orientation?: number) {
  const pixels = Buffer.alloc(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 3
      const noise = (x * 7 + y * 13) % 29
      pixels[i] = (x * 255) / width + noise
      pixels[i + 1] = (y * 255) / height + noise
      pixels[i + 2] = ((x + y) * 255) / (width + height) + noise
    }
  }
  let img = sharp(pixels, { raw: { width, height, channels: 3 } })
  if (orientation) img = img.withMetadata({ orientation })
  return format === 'png' ? img.png().toBuffer() : img.jpeg({ quality: 95 }).toBuffer()
}

const dims = async (buf: Buffer) => {
  const m = await sharp(buf).metadata()
  return { format: m.format, width: m.width, height: m.height }
}

test('a horizontal photo is cut to 800px on the long side, as WebP', async () => {
  const input = await sample(2400, 1200)
  const out = await prepareProfilePhoto(input)
  assert.deepEqual(await dims(out.buffer), { format: 'webp', width: 800, height: 400 })
  assert.equal(out.contentType, 'image/webp')
  assert.equal(out.ext, 'webp')
  assert.ok(out.buffer.length < input.length, `${out.buffer.length} should be smaller than ${input.length}`)
})

test('a vertical photo is cut to 800px high', async () => {
  const input = await sample(1200, 2400)
  const out = await prepareProfilePhoto(input)
  assert.deepEqual(await dims(out.buffer), { format: 'webp', width: 400, height: 800 })
  assert.deepEqual([out.width, out.height], [400, 800])
})

test('a small photo is not enlarged', async () => {
  const out = await prepareProfilePhoto(await sample(300, 400))
  assert.deepEqual(await dims(out.buffer), { format: 'webp', width: 300, height: 400 })
})

test('a PNG gives a WebP too', async () => {
  const out = await prepareProfilePhoto(await sample(1600, 900, 'png'))
  assert.deepEqual(await dims(out.buffer), { format: 'webp', width: 800, height: 450 })
})

test('a phone photo taken sideways (EXIF orientation 6) is turned the right way up', async () => {
  // stored as 1200x600 with "rotate 90°": it must come out as a portrait, 400x800
  const out = await prepareProfilePhoto(await sample(1200, 600, 'jpeg', 6))
  assert.deepEqual(await dims(out.buffer), { format: 'webp', width: 400, height: 800 })
})

test('the metadata (EXIF, GPS) is dropped', async () => {
  const out = await prepareProfilePhoto(await sample(1200, 600, 'jpeg', 6))
  const meta = await sharp(out.buffer).metadata()
  assert.equal(meta.exif, undefined)
})

test('a file that is not an image is refused', async () => {
  await assert.rejects(prepareProfilePhoto(Buffer.from('this is not an image')))
  await assert.rejects(prepareProfilePhoto(Buffer.alloc(0)))
})
