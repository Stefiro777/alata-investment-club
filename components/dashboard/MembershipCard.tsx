'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

interface MembershipCardProps {
  name: string
  role: string
  memberId: string | null
  memberSince: string | null
  expiresAt: string | null
}

const MONTHS_UP = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC']

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_UP[d.getMonth()]} ${d.getFullYear()}`
}

export default function MembershipCard({ name, role, memberId, memberSince, expiresAt }: MembershipCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const [qrUrl,  setQrUrl]  = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : true
  const isSoon    = !isExpired && expiresAt
    ? (new Date(expiresAt).getTime() - Date.now()) < 7 * 86400000
    : false

  useEffect(() => {
    if (!memberId) return
    import('qrcode').then(QRCode =>
      QRCode.toDataURL(`https://alatainvestmentclub.com/verify/${memberId}`, {
        color: { dark: '#ffffffff', light: '#00000000' },
        errorCorrectionLevel: 'M',
        width: 52,
        margin: 1,
      }).then(setQrUrl)
    )
  }, [memberId])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const { toJpeg } = await import('html-to-image')
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.97, pixelRatio: 3 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `membership-card-${memberId ?? 'alata'}.jpg`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const roleLabel = role.toUpperCase().replace(/_/g, ' ')

  return (
    <div style={{ maxWidth: 480, width: '100%' }}>
      {/* ── Card ── */}
      <div
        ref={cardRef}
        style={{
          aspectRatio: '856 / 540',
          width: '100%',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #1a4a3a 0%, #0d2a20 100%)',
          fontFamily: 'Inter, Arial, sans-serif',
          userSelect: 'none',
        }}
      >
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.5) 100%)',
        }} />

        {/* Content */}
        <div style={{ position: 'absolute', inset: 0, padding: '6%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* TOP ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/white.png" alt="Alata" style={{ height: 28, width: 'auto', objectFit: 'contain', display: 'block' }} />
            {/* Club name */}
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: 500, letterSpacing: '0.25em', textTransform: 'uppercase' }}>
              ALATA INVESTMENT CLUB
            </p>
          </div>

          {/* CENTER */}
          <div style={{ paddingTop: '4%', paddingBottom: '2%' }}>
            <p style={{
              margin: '0 0 6px',
              color: 'white',
              fontSize: 'clamp(22px, 4.5vw, 34px)',
              fontWeight: 300,
              letterSpacing: '-0.01em',
              lineHeight: 1.1,
              fontFamily: 'var(--font-cormorant, "Playfair Display", Georgia, serif)',
            }}>
              {name}
            </p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 500, letterSpacing: '0.4em', textTransform: 'uppercase' }}>
              {roleLabel}
            </p>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Left: membro dal */}
            <div>
              <p style={{ margin: '0 0 5px', color: 'rgba(255,255,255,0.5)', fontSize: 7, letterSpacing: '0.4em', textTransform: 'uppercase' }}>MEMBRO DAL</p>
              <p style={{ margin: 0, color: 'white', fontSize: 16, fontWeight: 300 }}>{memberSince ?? '—'}</p>
            </div>

            {/* Center: QR */}
            {qrUrl && (
              <div style={{ flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" style={{ width: 52, height: 52, display: 'block' }} />
              </div>
            )}

            {/* Right: expiry */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 5px', color: 'rgba(255,255,255,0.5)', fontSize: 7, letterSpacing: '0.4em', textTransform: 'uppercase' }}>VALIDA FINO AL</p>
              <p style={{ margin: 0, color: 'white', fontSize: 14, fontWeight: 300 }}>
                {expiresAt ? fmtDate(expiresAt) : '—'}
              </p>
              {memberId && (
                <p style={{ margin: '5px 0 0', color: 'rgba(255,255,255,0.4)', fontSize: 8, letterSpacing: '0.15em' }}>{memberId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Accent bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, pointerEvents: 'none',
          background: 'linear-gradient(90deg, #1a4a3a 0%, #2d7a5a 50%, #1a4a3a 100%)',
        }} />

        {/* Expired overlay */}
        {isExpired && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{ margin: 0, color: '#ef4444', fontSize: 18, fontWeight: 700, letterSpacing: '0.5em', textTransform: 'uppercase' }}>SCADUTA</p>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="border border-[#1a4a3a] text-[#1a4a3a] hover:bg-[#1a4a3a] hover:text-white text-[10px] font-semibold uppercase tracking-widest px-4 py-2 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? 'Download…' : 'Scarica Card'}
        </button>

        {(isExpired || isSoon) && (
          <Link
            href="/dashboard/membership"
            className="bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-[10px] font-semibold uppercase tracking-widest px-4 py-2 transition-colors"
          >
            Rinnova Membership
          </Link>
        )}
      </div>
    </div>
  )
}
