import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import Image from 'next/image'

const supabase = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default async function VerifyPage({ params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params

  const { data } = await supabase
    .from('club_members')
    .select('full_name, role, membership_expires_at')
    .eq('member_id', memberId)
    .maybeSingle()

  const valid = !!data?.membership_expires_at && new Date(data.membership_expires_at) > new Date()

  if (!valid) {
    return (
      <div style={{ minHeight: '100vh', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ width: 64, height: 64, background: '#fee2e2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="32" height="32" fill="none" stroke="#ef4444" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p style={{ fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', color: '#ef4444', fontWeight: 700, margin: '0 0 12px' }}>Not valid</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: '0 0 12px' }}>Membership expired or invalid</h1>
          <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, margin: 0 }}>
            This membership card is not active. Please contact Alata Investment Club for more information.
          </p>
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid #fecaca' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Alata Investment Club · alatainvestmentclub.com</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ background: 'white', maxWidth: 400, width: '100%', overflow: 'hidden', boxShadow: '0 4px 32px rgba(26,74,58,0.12)' }}>
        {/* Header band */}
        <div style={{ background: 'var(--forest)', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ margin: 0, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Alata Investment Club</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 700, color: 'white', letterSpacing: 1 }}>Membership Verification</p>
          </div>
          <Image src="/white-black.png" alt="Alata" width={40} height={40} style={{ objectFit: 'contain' }} />
        </div>

        {/* Valid badge */}
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 24, height: 24, background: '#22c55e', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#15803d', letterSpacing: 1, textTransform: 'uppercase' }}>Active Membership</p>
        </div>

        {/* Member info */}
        <div style={{ padding: '28px 24px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>Member</p>
          <p style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{data.full_name}</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>Role</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--forest)', textTransform: 'uppercase', letterSpacing: 1 }}>{data.role}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600 }}>Valid until</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{fmtDate(data.membership_expires_at!)}</p>
            </div>
          </div>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', letterSpacing: 1 }}>ID: {memberId}</p>
          </div>
        </div>

        <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 24px' }}>
          <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>Alata Investment Club · alatainvestmentclub.com</p>
        </div>
      </div>
    </div>
  )
}
