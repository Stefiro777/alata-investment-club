import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cvStoragePath, isCareerCvPath } from './cv-path.ts'

test('a stored path is returned as is', () => {
  assert.equal(cvStoragePath('abc/123_cv.pdf'), 'abc/123_cv.pdf')
})

test('a legacy public URL is converted to its path (decoded, no query)', () => {
  assert.equal(
    cvStoragePath('https://x.supabase.co/storage/v1/object/public/cv-uploads/job1/17_My%20CV.pdf?t=1'),
    'job1/17_My CV.pdf',
  )
})

test('unusable values give null', () => {
  assert.equal(cvStoragePath(null), null)
  assert.equal(cvStoragePath(''), null)
  assert.equal(cvStoragePath('https://evil.example/cv.pdf'), null)
  assert.equal(cvStoragePath('../secret'), null)
  assert.equal(cvStoragePath('/etc/passwd'), null)
})

test('career cv path validation only accepts what upload-cv generates', () => {
  assert.equal(isCareerCvPath('career-bookings/123e4567-e89b-12d3-a456-426614174000-cv.pdf'), true)
  assert.equal(isCareerCvPath('https://evil.example/x'), false)
  assert.equal(isCareerCvPath('career-bookings/../x'), false)
  assert.equal(isCareerCvPath(undefined), false)
})
