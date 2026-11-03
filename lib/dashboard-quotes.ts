// The line under the member's name on the Dashboard. One is picked on the
// server at every opening, never the same as the previous one.

export const DASHBOARD_QUOTES = [
  'Curiosity compounds. So does preparation.',
  'Read the footnotes. The edge is usually there.',
  'Do the reading before the meeting, not during it.',
  'A good question is half an analysis.',
  'Discipline is a decision you make every morning.',
  'Know the numbers, then trust your reasoning.',
  'Be curious first, be right second.',
  'Study the case you disagree with.',
  'Small habits, kept daily, outwork big plans.',
  'Write down the assumption. Then test it.',
  'Prepare as if the room will ask the hardest question.',
  'Depth beats speed, and then speed arrives.',
  'Ask one more why than everyone else.',
  'Consistency is a form of ambition.',
  'The prepared mind notices what others scroll past.',
] as const

/** A random index that differs from `last` (when `last` is a valid index). `random` returns [0, 1). */
export function pickQuoteIndex(last: number | null, random: () => number = Math.random): number {
  const n = DASHBOARD_QUOTES.length
  const hasLast = last !== null && Number.isInteger(last) && last >= 0 && last < n
  if (!hasLast) return Math.min(n - 1, Math.floor(random() * n))
  const i = Math.min(n - 2, Math.floor(random() * (n - 1)))
  return i >= last ? i + 1 : i
}
