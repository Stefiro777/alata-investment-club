'use client'

// Shared look & helpers of the Career dashboard pages (bookings, me).

export const inputCls   = 'w-full border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-forest bg-white'
export const labelCls   = 'block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1'
export const btnPrimary = 'bg-forest hover:bg-forest-deep text-white text-xs font-semibold uppercase tracking-widest px-5 py-2 transition-colors disabled:opacity-40'
export const btnGhost   = 'border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:border-gray-400 transition-colors'

// Mon–Sun order for display; values are JS getDay() (0=Sun)
export const DOW_BUTTONS = [
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
  { label: 'Sun', value: 0 },
]
export const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export type MentorLite = { id: string; full_name: string }

export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function statusBadgeCls(status: string): string {
  if (status === 'confirmed') return 'bg-forest text-white'
  if (status === 'cancelled') return 'bg-red-100 text-red-700'
  return 'bg-yellow-100 text-yellow-800'
}

export function statusLabel(status: string): string {
  if (status === 'confirmed') return 'CONFIRMED'
  if (status === 'cancelled') return 'CANCELLED'
  return 'PENDING'
}

export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function ConfirmDelete({
  onConfirm,
  onCancel,
  busy,
}: {
  onConfirm: () => void
  onCancel: () => void
  busy: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">Delete?</span>
      <button onClick={onConfirm} disabled={busy}
        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
        {busy ? '…' : 'Yes'}
      </button>
      <button onClick={onCancel} className="text-xs text-gray-400 hover:text-gray-700">No</button>
    </div>
  )
}
