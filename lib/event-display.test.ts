import { test } from 'node:test'
import assert from 'node:assert/strict'
import { describeFilmUrl, isVerticalFilm, youtubeEmbed } from './event-display.ts'

const SHORT = 'https://youtube.com/shorts/_O3zrR-Duls?is=X3XtB8zWv6kmz_pV'
const WATCH = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'

test('the links used by the stories become an embed, Shorts included', () => {
  assert.equal(youtubeEmbed(SHORT), 'https://www.youtube-nocookie.com/embed/_O3zrR-Duls?autoplay=1&rel=0')
  assert.equal(youtubeEmbed('https://youtube.com/shorts/wWgeE8PfHe8'), 'https://www.youtube-nocookie.com/embed/wWgeE8PfHe8?autoplay=1&rel=0')
  assert.equal(youtubeEmbed(WATCH), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
  assert.equal(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0')
})

test('only a YouTube Short is vertical', () => {
  assert.equal(isVerticalFilm(SHORT), true)
  assert.equal(isVerticalFilm('https://www.youtube.com/shorts/GXXZWJIDmD0'), true)
  assert.equal(isVerticalFilm(WATCH), false)
  assert.equal(isVerticalFilm('https://youtu.be/dQw4w9WgXcQ'), false)
})

test('links that cannot be embedded are never vertical', () => {
  assert.equal(isVerticalFilm('https://vimeo.com/123456789'), false)
  assert.equal(isVerticalFilm('https://example.com/shorts/abc'), false)
  assert.equal(isVerticalFilm('https://youtube.com/shorts/'), false)
  assert.equal(isVerticalFilm(null), false)
  assert.equal(isVerticalFilm(''), false)
})

test('the Board hint: empty, vertical, horizontal or not supported', () => {
  assert.equal(describeFilmUrl(''), 'empty')
  assert.equal(describeFilmUrl('   '), 'empty')
  assert.equal(describeFilmUrl(undefined), 'empty')
  assert.equal(describeFilmUrl(` ${SHORT} `), 'vertical')
  assert.equal(describeFilmUrl(WATCH), 'horizontal')
  assert.equal(describeFilmUrl('https://vimeo.com/123456789'), 'unsupported')
  assert.equal(describeFilmUrl('https://www.instagram.com/reel/abc/'), 'unsupported')
})
