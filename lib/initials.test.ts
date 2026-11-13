import { test } from 'node:test'
import assert from 'node:assert/strict'
import { initialsOf } from './initials.ts'

test('two words give two capitals', () => {
  assert.equal(initialsOf('Stefano Finulli'), 'SF')
  assert.equal(initialsOf('Marco Rossi'), 'MR')
  assert.equal(initialsOf('andrés ruiz'), 'AR')
})

test('a name is split on spaces, not on the letter "s"', () => {
  // with the broken /s+/ pattern "Alessandro Bassi" was cut at every "s"
  assert.equal(initialsOf('Alessandro Bassi'), 'AB')
  assert.equal(initialsOf('Sofia Sassi'), 'SS')
})

test('extra spaces, one word, three words and empty values', () => {
  assert.equal(initialsOf('  Andrés    Ruiz  '), 'AR')
  assert.equal(initialsOf('Madonna'), 'M')
  assert.equal(initialsOf('Anna Maria Rossi'), 'AM')
  assert.equal(initialsOf(''), '')
  assert.equal(initialsOf(null), '')
  assert.equal(initialsOf(undefined), '')
})
