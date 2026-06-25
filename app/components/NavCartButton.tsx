'use client'

import { useCart } from '@/app/components/CartContext'

export default function NavCartButton() {
  const { count, openDrawer } = useCart()
  if (count === 0) return null

  return (
    <button
      onClick={openDrawer}
      className="relative flex items-center text-white/80 hover:text-white transition-colors flex-shrink-0"
      aria-label={`Open cart (${count} items)`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
      </svg>
      <span className="absolute -top-2 -right-2.5 w-4 h-4 bg-white text-[#1a4a3a] text-[9px] font-bold flex items-center justify-center border border-[#1a4a3a]">
        {count > 9 ? '9+' : count}
      </span>
    </button>
  )
}
