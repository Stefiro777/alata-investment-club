'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import Image from 'next/image'

// ── Types ─────────────────────────────────────────────────────────────────────

export type CartVariant = {
  id: string
  color: string
  color_hex: string | null
  image: string | null
}

export type CartItem = {
  cartKey: string   // `${productId}:${variantId}:${size}:${textVariant|none}`
  productId: string
  name: string
  variant: CartVariant
  size: string
  textVariant: string | null
  priceCents: number
  quantity: number
}

type CartContext = {
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

// ── Context ───────────────────────────────────────────────────────────────────

const Ctx = createContext<CartContext | null>(null)

export function useCart() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
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
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md z-[201] bg-white flex flex-col shadow-2xl"
        style={{ fontFamily: 'Inter, sans-serif' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="font-serif text-xl font-bold text-gray-900">Carrello</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <p className="text-sm text-gray-400 mb-2">Il tuo carrello è vuoto.</p>
              <button onClick={onClose}
                className="text-xs font-semibold uppercase tracking-widest text-[#1a4a3a] underline">
                Continua lo shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.cartKey} className="flex gap-4 border border-gray-100 p-3">
                {item.variant.image && (
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100 overflow-hidden">
                    <Image src={item.variant.image} alt={item.name} fill className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {item.variant.color} / {item.size}
                    {item.textVariant ? ` / ${item.textVariant}` : ''}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-600 hover:border-[#1a4a3a] transition-colors text-sm">−</button>
                      <span className="text-sm w-4 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center border border-gray-200 text-gray-600 hover:border-[#1a4a3a] transition-colors text-sm">+</button>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {fmtEur(item.priceCents * item.quantity)}
                    </p>
                  </div>
                </div>
                <button onClick={() => removeItem(item.cartKey)}
                  className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 self-start mt-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 px-6 py-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Totale</p>
              <p className="text-xl font-bold text-gray-900">{fmtEur(totalCents)}</p>
            </div>
            <button
              onClick={onCheckout}
              className="w-full bg-[#1a4a3a] hover:bg-[#123a2d] text-white text-xs font-semibold uppercase tracking-widest py-4 transition-colors"
            >
              Procedi al Pagamento →
            </button>
            <button onClick={clearCart}
              className="w-full text-xs text-gray-400 hover:text-gray-700 transition-colors text-center">
              Svuota carrello
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ── CartProvider ──────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: ReactNode }) {
  const [items,      setItems]      = useState<CartItem[]>([])
  const [drawerOpen, setDrawerOpen] = useState(false)

  const addItem = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setItems(prev => {
      const existing = prev.find(i => i.cartKey === item.cartKey)
      if (existing) {
        return prev.map(i => i.cartKey === item.cartKey ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, quantity: 1 }]
    })
    setDrawerOpen(true)
  }, [])

  const removeItem = useCallback((cartKey: string) => {
    setItems(prev => prev.filter(i => i.cartKey !== cartKey))
  }, [])

  const updateQty = useCallback((cartKey: string, qty: number) => {
    if (qty <= 0) { removeItem(cartKey); return }
    setItems(prev => prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i))
  }, [removeItem])

  const clearCart = useCallback(() => setItems([]), [])

  const totalCents = items.reduce((s, i) => s + i.priceCents * i.quantity, 0)
  const count      = items.reduce((s, i) => s + i.quantity, 0)

  function handleCheckout() {
    if (items.length === 0) return
    window.location.href = '/checkout'
  }

  return (
    <Ctx.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      totalCents, count,
      drawerOpen, openDrawer: () => setDrawerOpen(true), closeDrawer: () => setDrawerOpen(false),
    }}>
      {children}

      {/* Cart icon button — fixed bottom-right, only on /merch pages */}
      {count > 0 && !drawerOpen && (
        <button
          onClick={() => setDrawerOpen(true)}
          className="fixed bottom-6 right-6 z-[190] w-14 h-14 bg-[#1a4a3a] hover:bg-[#123a2d] text-white shadow-xl flex items-center justify-center transition-colors"
          aria-label="Apri carrello"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-[#1a4a3a] text-[10px] font-bold flex items-center justify-center border border-[#1a4a3a]">
            {count}
          </span>
        </button>
      )}

      {/* Drawer */}
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
