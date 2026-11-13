import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isCardPhoto, renderCardJpeg, type ToJpeg } from './card-download.ts'

const node = {} as HTMLElement

test('the portrait node is recognised by data-card-photo, nothing else is', () => {
  assert.equal(isCardPhoto({ dataset: { cardPhoto: '' } }), true)
  assert.equal(isCardPhoto({ dataset: {} }), false)
  assert.equal(isCardPhoto({}), false)
  assert.equal(isCardPhoto(null), false)
})

test('the card is rendered once, with the photo, when all goes well', async () => {
  const calls: unknown[] = []
  const toJpeg: ToJpeg = async (_n, o) => { calls.push(o); return 'data:image/jpeg;base64,AAA' }
  assert.equal(await renderCardJpeg(node, toJpeg), 'data:image/jpeg;base64,AAA')
  assert.equal(calls.length, 1)
  assert.equal((calls[0] as { filter?: unknown }).filter, undefined)
})

test('if the photo makes the render fail, the card is rendered again without it', async () => {
  let n = 0
  let filter: ((node: Node) => boolean) | undefined
  const toJpeg: ToJpeg = async (_n, o) => {
    n++
    if (n === 1) throw new Error('image could not be embedded')
    filter = o.filter
    return 'data:image/jpeg;base64,BBB'
  }
  assert.equal(await renderCardJpeg(node, toJpeg), 'data:image/jpeg;base64,BBB')
  assert.equal(n, 2)
  assert.ok(filter)
  assert.equal(filter!({ dataset: { cardPhoto: '' } } as unknown as Node), false) // the photo is left out
  assert.equal(filter!({ dataset: {} } as unknown as Node), true) // everything else stays
  assert.equal(filter!({} as unknown as Node), true) // text nodes have no dataset
})

test('if even the card without the photo fails, the error comes out', async () => {
  const toJpeg: ToJpeg = async () => { throw new Error('boom') }
  await assert.rejects(renderCardJpeg(node, toJpeg), /boom/)
})

test('a render that never ends is cut off and the card is rendered again without the photo', async () => {
  let n = 0
  const toJpeg: ToJpeg = (_n, o) => {
    n++
    if (n === 1) return new Promise<string>(() => {}) // stalls
    assert.ok(o.filter)
    return Promise.resolve('data:image/jpeg;base64,CCC')
  }
  assert.equal(await renderCardJpeg(node, toJpeg, 30), 'data:image/jpeg;base64,CCC')
  assert.equal(n, 2)
})

test('if both renders stall, it ends with an error instead of waiting forever', async () => {
  const toJpeg: ToJpeg = () => new Promise<string>(() => {})
  await assert.rejects(renderCardJpeg(node, toJpeg, 20), /too long/)
})
