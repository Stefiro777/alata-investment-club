export const BUY_SIDE_RUBRIC = {
  valuation_mechanics: 0.25,
  discipline: 0.25,
  commercial_judgment: 0.20,
  deal_structuring: 0.15,
  qa_quality: 0.15,
} as const

export const SELL_SIDE_RUBRIC = {
  price_vs_fair_value: 0.30,
  mandate_compliance: 0.30,
  diligence_management: 0.25,
  presentation: 0.15,
} as const

export type RubricCriterion = keyof typeof BUY_SIDE_RUBRIC | keyof typeof SELL_SIDE_RUBRIC

export function getRubricForRole(roleKey: string): Record<string, number> | null {
  if (roleKey === 'sell_side') return SELL_SIDE_RUBRIC
  if (roleKey === 'buy_side_1' || roleKey === 'buy_side_2' || roleKey === 'buy_side_3') return BUY_SIDE_RUBRIC
  return null
}
