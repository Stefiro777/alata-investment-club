'use client'

import { useCart } from '@/app/components/CartContext'

export default function MerchCartBar() {
  const { count, openDrawer } = useCart()

  return (
    <div className="sticky top-[64px] z-50 bg-white border-b border-line-faint">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-11">
        <p className="text-xs font-semibold uppercase tracking-widest text-black/40">Shop</p>
        <button
          onClick={openDrawer}
          className="relative flex items-center justify-center w-11 h-11 hover:opacity-70 transition-opacity"
          aria-label="Open cart"
        >
          <svg className="w-7 h-7 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-forest text-white text-[9px] font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
