'use client'

import { useRef, useEffect, useState } from 'react'
import Link from 'next/link'

interface MembershipCardProps {
  name: string
  role: string
  memberId: string | null
  memberSince: string | null  // year string e.g. "2024"
  expiresAt: string | null
}

const MONTHS_IT = ['gen','feb','mar','apr','mag','giu','lug','ago','set','ott','nov','dic']

function fmtDateShort(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_IT[d.getMonth()]} ${d.getFullYear()}`
}

export default function MembershipCard({ name, role, memberId, memberSince, expiresAt }: MembershipCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [qrUrl, setQrUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  const isExpired = expiresAt ? new Date(expiresAt) <= new Date() : true
  const isSoon    = !isExpired && expiresAt
    ? (new Date(expiresAt).getTime() - Date.now()) < 7 * 86400000
    : false

  // Generate QR code on client only
  useEffect(() => {
    if (!memberId) return
    const verifyUrl = `https://alatainvestmentclub.com/verify/${memberId}`
    import('qrcode').then(QRCode => {
      QRCode.toDataURL(verifyUrl, {
        color: { dark: '#ffffffff', light: '#00000000' },
        errorCorrectionLevel: 'M',
        width: 160,
        margin: 1,
      }).then(url => setQrUrl(url))
    })
  }, [memberId])

  async function handleDownload() {
    if (!cardRef.current) return
    setDownloading(true)
    try {
      const { toJpeg } = await import('html-to-image')
      const dataUrl = await toJpeg(cardRef.current, { quality: 0.97, pixelRatio: 2 })
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `membership-card-${memberId ?? 'alata'}.jpg`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1).replace(/_/g, ' ')

  return (
    <div className="space-y-3">
      {/* Card */}
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
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }} />
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at 50% 50%, transparent 35%, rgba(0,0,0,0.45) 100%)',
        }} />

        {/* Content layer */}
        <div style={{ position: 'absolute', inset: 0, padding: '5%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>

          {/* TOP ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', fontSize: '1.8cqi', fontWeight: 700, letterSpacing: '0.35em', textTransform: 'uppercase' }}>MEMBERSHIP</p>
            <p style={{ margin: 0, color: 'white', fontSize: '2cqi', fontWeight: 700, letterSpacing: '0.08em', fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>ALATA INVESTMENT CLUB</p>
          </div>

          {/* CENTER */}
          <div>
            <p style={{ margin: '0 0 0.3em', color: 'white', fontSize: '5.5cqi', fontWeight: 300, letterSpacing: '0.02em', lineHeight: 1.1 }}>{name}</p>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '1.8cqi', fontWeight: 600, letterSpacing: '0.28em', textTransform: 'uppercase' }}>{roleLabel}</p>
          </div>

          {/* BOTTOM ROW */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            {/* Left */}
            <div>
              <p style={{ margin: '0 0 0.4em', color: 'rgba(255,255,255,0.45)', fontSize: '1.4cqi', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>MEMBRO DAL</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '2.4cqi', fontWeight: 600 }}>{memberSince ?? '—'}</p>
            </div>

            {/* QR code */}
            {qrUrl && (
              <div style={{ width: '17%', flexShrink: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="QR" style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            )}

            {/* Right */}
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 0.4em', color: 'rgba(255,255,255,0.45)', fontSize: '1.4cqi', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>VALIDA FINO AL</p>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: '2cqi', fontWeight: 600 }}>
                {expiresAt ? fmtDateShort(expiresAt) : '—'}
              </p>
              {memberId && (
                <p style={{ margin: '0.4em 0 0', color: 'rgba(255,255,255,0.4)', fontSize: '1.4cqi', letterSpacing: '0.12em', fontFamily: 'monospace' }}>{memberId}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bottom accent bar */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', pointerEvents: 'none',
          background: 'linear-gradient(90deg, #1a4a3a 0%, #2d7a5a 50%, #1a4a3a 100%)',
        }} />

        {/* Expired overlay */}
        {isExpired && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(15,15,15,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{ color: '#ef4444', fontSize: '7cqi', fontWeight: 900, letterSpacing: '0.25em', textTransform: 'uppercase', margin: 0, textShadow: '0 2px 12px rgba(239,68,68,0.5)' }}>SCADUTA</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
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
