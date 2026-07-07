export const ROLE_COLORS: Record<string, string> = {
  sell_side: '#1a4a3a',
  buy_side_1: '#1d4e63',
  buy_side_2: '#7a2e3a',
  buy_side_3: '#a3742a',
}

export function getRoleColor(roleKey: string): string {
  return ROLE_COLORS[roleKey] ?? '#6b7280'
}
