'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { isEventPast } from '@/lib/event-past'

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
  /** Units available when the item was added; null/undefined = unlimited (the server re-checks at checkout). */
  maxQty?: number | null
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

/** The saved cart; tickets for events that have already taken place are dropped (merch stays). */
function loadFromStorage(): { items: CartItem[]; removedPast: boolean } {
  if (typeof window === 'undefined') return { items: [], removedPast: false }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved: CartItem[] = raw ? JSON.parse(raw) : []
    const items = saved.filter(i => !(i.type === 'ticket' && isEventPast(i.eventDate)))
    return { items, removedPast: items.length !== saved.length }
  } catch { return { items: [], removedPast: false } }
}

// ── CartDrawer (board M3: the cart slides in from the right) ─────────────────

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
  const reduced = useReducedMotion()
  const merch   = items.filter(i => !i.type || i.type === 'merch')
  const tickets = items.filter(i => i.type === 'ticket')
  const hasMixed = merch.length > 0 && tickets.length > 0

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function renderItem(item: CartItem) {
    const isTicket = item.type === 'ticket'
    const meta = isTicket
      ? [item.eventDate ? fmtDate(item.eventDate) : null, item.eventLocation].filter(Boolean).join(' · ')
      : [item.variant?.color, item.size ? `Size ${item.size}` : null, item.textVariant].filter(Boolean).join(' · ')
    return (
      <li key={item.cartKey} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-start gap-4 border-b border-night/20 py-4">
        <div className="relative h-[70px] w-[56px] overflow-hidden bg-sand">
          {!isTicket && item.variant?.image && <Image src={item.variant.image} alt="" fill className="object-cover" />}
          {isTicket && <span className="absolute inset-0 flex items-center justify-center font-serif text-[22px] italic text-club">T</span>}
        </div>
        <div className="min-w-0">
          <p className="font-serif text-[22px] font-medium leading-[1.15]">{item.name}</p>
          {meta && <p className="mt-1 text-[13px] text-earth-700">{meta}</p>}
          <div className="mt-2 flex items-center gap-3 text-[13px]">
            {!isTicket && (
              <>
                <button type="button" onClick={() => updateQty(item.cartKey, item.quantity - 1)} aria-label="One less" className="flex h-8 w-8 items-center justify-center rounded-full border border-night/30 hover:border-night">−</button>
                <span className="w-4 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                  disabled={item.maxQty != null && item.quantity >= item.maxQty}
                  aria-label="One more"
                  title={item.maxQty != null && item.quantity >= item.maxQty ? 'Maximum available quantity' : undefined}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-night/30 hover:border-night disabled:opacity-30"
                >+</button>
              </>
            )}
            <button type="button" onClick={() => removeItem(item.cartKey)} className="text-earth-500 underline underline-offset-4 hover:text-night">Remove</button>
          </div>
        </div>
        <p className="font-serif text-[22px] font-medium">{fmtEur(item.priceCents * item.quantity)}</p>
      </li>
    )
  }

  return (
    <>
      <motion.div
        className="fixed inset-0 z-[200] bg-night/60"
        onClick={onClose}
        aria-hidden
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={reduced ? undefined : { opacity: 0 }}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-[600px] flex-col bg-ivory px-[clamp(24px,5vw,64px)] text-night"
        initial={reduced ? false : { x: '100%' }}
        animate={{ x: 0 }}
        exit={reduced ? undefined : { x: '100%' }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex items-baseline justify-between pb-6 pt-10">
          <h2 className="font-serif text-[48px] font-medium leading-[1.1]">Your cart</h2>
          <button type="button" onClick={onClose} className="text-[13px] font-medium hover:underline underline-offset-[6px]">Close</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-night">
          {items.length === 0 ? (
            <div className="py-16">
              <p className="font-serif text-[28px] italic text-earth-700">Your cart is empty.</p>
              <button type="button" onClick={onClose} className="mt-4 text-[13px] underline underline-offset-4">Continue browsing</button>
            </div>
          ) : (
            <>
              {tickets.length > 0 && (
                <>
                  {hasMixed && <p className="rd-eyebrow pt-5 text-[10px] text-earth-500">Tickets</p>}
                  <ul>{tickets.map(renderItem)}</ul>
                </>
              )}
              {merch.length > 0 && (
                <>
                  {hasMixed && <p className="rd-eyebrow pt-5 text-[10px] text-earth-500">Merch</p>}
                  <ul>{merch.map(renderItem)}</ul>
                </>
              )}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className="pb-10 pt-6">
            {merch.length > 0 && (
              <div className="flex justify-between text-[14px] text-earth-700">
                <span>Shipping (IT, EU, World)</span>
                <span>calculated at checkout</span>
              </div>
            )}
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-[14px]">Subtotal</span>
              <span className="font-serif text-[36px] font-medium">{fmtEur(totalCents)}</span>
            </div>
            <div className="mt-6 flex items-baseline justify-between gap-6">
              <button type="button" onClick={onCheckout} className="font-serif text-[46px] font-medium italic leading-[1.1] text-club hover:underline underline-offset-[0.18em]">
                Checkout
              </button>
              <button type="button" onClick={clearCart} className="text-[13px] text-earth-500 hover:text-night">Clear cart</button>
            </div>
          </div>
        )}
      </motion.aside>
    </>
  )
}

// ── CartProvider ──────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(loadFromStorage)
  const [items,      setItems]      = useState<CartItem[]>(initial.items)
  const [pastNotice, setPastNotice] = useState(initial.removedPast)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Persist to localStorage whenever items change
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)) } catch { /* ignore */ }
  }, [items])

  useEffect(() => {
    if (!pastNotice) return
    const t = setTimeout(() => setPastNotice(false), 9000)
    return () => clearTimeout(t)
  }, [pastNotice])

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    const full: CartItem = { type: 'merch', ...item, quantity: 1 }
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === full.cartKey)
      if (existing && full.type === 'ticket') return prev
      if (existing) {
        const cap = full.maxQty ?? existing.maxQty
        if (cap != null && existing.quantity >= cap) return prev
        return prev.map(i => i.cartKey === full.cartKey ? { ...i, maxQty: cap, quantity: i.quantity + 1 } : i)
      }
      if (full.maxQty != null && full.maxQty <= 0) return prev
      return [...prev, full]
    })
    setDrawerOpen(true)
  }, [])

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey))
  }, [])

  const updateQty = useCallback((cartKey: string, qty: number) => {
    if (qty <= 0) { setItems(prev => prev.filter(i => i.cartKey !== cartKey)); return }
    setItems(prev => prev.map(i => i.cartKey === cartKey
      ? { ...i, quantity: i.maxQty != null ? Math.min(qty, i.maxQty) : qty }
      : i))
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

      {pastNotice && (
        <div role="status" className="fixed inset-x-4 bottom-6 z-[200] mx-auto flex max-w-[460px] items-start gap-4 bg-night px-5 py-4 text-[13px] leading-[1.5] text-ivory shadow-[0_12px_32px_-12px_rgba(11,29,22,0.6)]">
          <span>An event in your cart has already taken place and was removed.</span>
          <button type="button" onClick={() => setPastNotice(false)} className="ml-auto shrink-0 text-ivory/70 hover:text-ivory" aria-label="Dismiss">&times;</button>
        </div>
      )}

      {/* Floating cart button — visible when cart has items and drawer is closed */}
      {count > 0 && !drawerOpen && !pathname.startsWith('/checkout') && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-[190] rounded-full bg-night px-5 py-3 text-[13px] font-medium tracking-[0.04em] text-ivory shadow-[0_12px_32px_-12px_rgba(11,29,22,0.6)] transition-colors hover:bg-moss"
          aria-label={`Open cart (${count} items)`}
        >
          Cart ({count > 9 ? '9+' : count})
        </button>
      )}

      <AnimatePresence>
      {drawerOpen && (
        <CartDrawer
          key="cart"
          items={items}
          totalCents={totalCents}
          removeItem={removeItem}
          updateQty={updateQty}
          clearCart={clearCart}
          onClose={() => setDrawerOpen(false)}
          onCheckout={handleCheckout}
        />
      )}
      </AnimatePresence>
    </Ctx.Provider>
  )
}
