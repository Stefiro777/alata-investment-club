'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CartVariant = {
  id: string
  color: string
  color_hex: string | null
  image: string | null
}

export type CartItem = {
  cartKey: string
  name: string
  priceCents: number
  quantity: number
  type?: 'merch' | 'ticket'
  // merch
  productId?: string
  variant?: CartVariant
  size?: string
  textVariant?: string | null
  // ticket
  eventId?: string
  eventDate?: string
  eventLocation?: string | null
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (cartKey: string) => void
  updateQty: (cartKey: string, qty: number) => void
  clearCart: () => void
  totalCents: number
  count: number
  drawerOpen: boolean
  openDrawer: () => void
  closeDrawer: () => void
}

const Ctx = createContext<CartContextType | null>(null)

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function fmtDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const STORAGE_KEY = 'alata-cart-v1'

function loadFromStorage(): CartItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg className="w-7 h-7 text-forest" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

// ── CartDrawer ────────────────────────────────────────────────────────────────

function CartDrawer({
  items, totalCents, removeItem, updateQty, clearCart, onClose, onCheckout,
}: {
  items: CartItem[]
  totalCents: number
  removeItem: (key: string) => void
  updateQty: (key: string, qty: number) => void
  clearCart: () => void
  onClose: () => void
  onCheckout: () => void
}) {
  const merch   = items.filter(i => !i.type || i.type === 'merch')
  const tickets = items.filter(i => i.type === 'ticket')
  const hasMixed = merch.length > 0 && tickets.length > 0

  function renderMerchItem(item: CartItem) {
    return (
      <div key={item.cartKey} className="flex gap-4 border border-gray-100 p-3">
        {item.variant?.image ? (
          <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 overflow-hidden">
            <Image src={item.variant.image} alt={item.name} fill className="object-cover" />
          </div>
        ) : (
          <div className="w-16 h-16 flex-shrink-0 bg-gray-100" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[item.variant?.color, item.size, item.textVariant].filter(Boolean).join(' / ')}
          </p>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <button onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                className="w-11 h-11 flex items-center justify-center border border-gray-200 text-gray-600 hover:border-forest transition-colors text-sm">−</button>
              <span className="text-sm w-4 text-center">{item.quantity}</span>
              <button onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                className="w-11 h-11 flex items-center justify-center border border-gray-200 text-gray-600 hover:border-forest transition-colors text-sm">+</button>
            </div>
            <p className="text-sm font-semibold text-gray-900">{fmtEur(item.priceCents * item.quantity)}</p>
          </div>
        </div>
        <button onClick={() => removeItem(item.cartKey)}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 self-start -m-3.5 p-3.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  function renderTicketItem(item: CartItem) {
    return (
      <div key={item.cartKey} className="flex gap-4 border border-gray-100 p-3">
        <div className="w-16 h-16 flex-shrink-0 bg-forest/10 flex items-center justify-center">
          <CalendarIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {[item.eventDate ? fmtDate(item.eventDate) : null, item.eventLocation].filter(Boolean).join(' · ')}
          </p>
          <p className="text-sm font-semibold text-gray-900 mt-2">{fmtEur(item.priceCents)}</p>
        </div>
        <button onClick={() => removeItem(item.cartKey)}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 self-start -m-3.5 p-3.5">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  const SECTION_CLS = 'text-[10px] font-semibold uppercase tracking-widest text-gray-400'

  return (
    <>
      <div className="fixed inset-0 z-[200] bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed right-0 top-0 h-full w-full max-w-md z-[201] bg-white flex flex-col shadow-2xl"
           style={{ fontFamily: 'Inter, sans-serif' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="font-serif text-xl font-bold text-gray-900">Cart</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-sm text-gray-400 mb-2">Your cart is empty.</p>
              <button onClick={onClose}
                className="text-xs font-semibold uppercase tracking-widest text-forest underline">
                Continue shopping
              </button>
            </div>
          ) : (
            <>
              {tickets.length > 0 && (
                <>
                  {hasMixed && <p className={SECTION_CLS}>Tickets</p>}
                  {tickets.map(renderTicketItem)}
                </>
              )}
              {merch.length > 0 && (
                <>
                  {hasMixed && <p className={`${SECTION_CLS} pt-2`}>Merch</p>}
                  {merch.map(renderMerchItem)}
                </>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Total</p>
              <p className="text-xl font-bold text-gray-900">{fmtEur(totalCents)}</p>
            </div>
            <button onClick={onCheckout}
              className="w-full bg-forest hover:bg-[#143d30] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors">
              Proceed to Checkout →
            </button>
            <button onClick={clearCart}
              className="w-full text-xs text-gray-400 hover:text-gray-700 transition-colors text-center">
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── CartProvider ──────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,      setItems]      = useState<CartItem[]>(loadFromStorage)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()

  // Persist to localStorage whenever items change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    console.log('addItem received:', item)
    console.log('existing cart:', items)
    const full: CartItem = { type: 'merch', ...item, quantity: 1 }
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === full.cartKey)
      if (existing && full.type === 'ticket') return prev
      if (existing) return prev.map(i => i.cartKey === full.cartKey ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, full]
    })
    setDrawerOpen(true)
  }, [])

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey))
  }, [])

  const updateQty = useCallback((cartKey: string, qty: number) => {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.cartKey !== cartKey)); return }
    setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  }, [])

  const totalCents = items.reduce((s, i) => s + i.priceCents * i.quantity, 0)
  const count      = items.reduce((s, i) => s + i.quantity, 0)

  function handleCheckout() {
    if (items.length === 0) return
    setDrawerOpen(false)
    router.push('/checkout')
  }

  return (
    <Ctx.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalCents, count,
      drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    }}>
      {children}

      {/* Floating cart button — visible when cart has items and drawer is closed */}
      {count > 0 && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-[190] w-14 h-14 bg-forest hover:bg-[#143d30] text-white shadow-xl flex items-center justify-center transition-colors"
          aria-label="Open cart"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-forest text-[10px] font-bold flex items-center justify-center border border-forest">
            {count > 9 ? '9+' : count}
          </span>
        </button>
      )}

      {drawerOpen && (
        <CartDrawer
          items={items}
          totalCents={totalCents}
          removeItem={removeItem}
          updateQty={updateQty}
          clearCart={clearCart}
          onClose={() => setDrawerOpen(false)}
          onCheckout={handleCheckout}
        />
      )}
    </Ctx.Provider>
  )
}
