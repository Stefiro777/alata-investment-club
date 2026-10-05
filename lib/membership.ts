import type { SupabaseClient } from '@supabase/supabase-js'

// Membership year rule: every annual fee expires on 31 December (Europe/Rome,
// 23:59:59). Someone who pays from the cutoff date (default 1 October) of year N
// is covered until 31/12 of year N+1; before the cutoff, until 31/12 of year N.
// The cutoff lives in membership_settings (renewal_cutoff_month/day).

export const MEMBERSHIP_TIMEZONE = 'Europe/Rome'

/** After the expiry the dashboard stays reachable for this many days. */
export const MEMBERSHIP_GRACE_DAYS = 15

export type RenewalRule = { cutoffMonth: number; cutoffDay: number }

export const DEFAULT_RENEWAL_RULE: RenewalRule = { cutoffMonth: 10, cutoffDay: 1 }

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number }

function zonedParts(utcMs: number): ZonedParts {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: MEMBERSHIP_TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  })
  const out: Record<string, number> = {}
  for (const p of fmt.formatToParts(new Date(utcMs))) {
    if (p.type !== 'literal') out[p.type] = parseInt(p.value, 10)
  }
  return { year: out.year, month: out.month, day: out.day, hour: out.hour, minute: out.minute, second: out.second }
}

/** UTC instant of a wall-clock time in Europe/Rome. */
function romeWallClockToUtc(year: number, month: number, day: number, hour: number, minute: number, second: number): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second)
  // Offset of Rome at (roughly) that instant; re-evaluated once to settle on DST edges.
  let guess = asUtc
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(guess)
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
    guess = asUtc - (shown - guess)
  }
  return new Date(guess)
}

/** Expiry (31/12 23:59:59 Europe/Rome) for a fee paid at `paidAt`. */
export function computeMembershipExpiry(paidAt: Date = new Date(), rule: RenewalRule = DEFAULT_RENEWAL_RULE): Date {
  const { year, month, day } = zonedParts(paidAt.getTime())
  const afterCutoff = month > rule.cutoffMonth || (month === rule.cutoffMonth && day >= rule.cutoffDay)
  return romeWallClockToUtc(afterCutoff ? year + 1 : year, 12, 31, 23, 59, 59)
}

export function renewalRuleFromSettings(
  s: { renewal_cutoff_month?: number | null; renewal_cutoff_day?: number | null } | null | undefined,
): RenewalRule {
  const month = s?.renewal_cutoff_month
  const day = s?.renewal_cutoff_day
  if (!Number.isInteger(month) || !Number.isInteger(day) || month! < 1 || month! > 12 || day! < 1 || day! > 31) {
    return DEFAULT_RENEWAL_RULE
  }
  return { cutoffMonth: month!, cutoffDay: day! }
}

/** Reads the renewal rule from membership_settings (defaults when missing). */
export async function loadRenewalRule(supabase: SupabaseClient): Promise<RenewalRule> {
  const { data } = await supabase
    .from('membership_settings')
    .select('renewal_cutoff_month, renewal_cutoff_day')
    .limit(1)
    .maybeSingle()
  return renewalRuleFromSettings(data)
}
