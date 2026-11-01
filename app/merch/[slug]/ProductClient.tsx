'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/app/components/CartContext'
import { effectiveStock, stockLabel } from '@/lib/merch-stock'

type Variant = {
  id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number
  stock?: number | null
}
type TextVariant = { id: string; option: string; sort_order: number }
type Product = {
  id: string; slug: string; name: string; price_cents: number
  description: string | null; sizes: string[] | null
  details: Record<string, string> | null
  stock?: number | null
  size_stock?: Record<string, number> | null
  product_variants: Variant[]
  product_text_variants: TextVariant[]
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function ProductClient({ product }: { product: Product }) {
  const { addItem, items: cartItems } = useCart()

  const variants   = [...(product.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const textVars   = [...(product.product_text_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const sizes      = product.sizes ?? []

  const [selectedVariant, setSelectedVariant] = useState<Variant>(variants[0] ?? null as unknown as Variant)
  const [selectedSize,    setSelectedSize]    = useState<string>(sizes[0] ?? '')
  const [selectedText,    setSelectedText]    = useState<string | null>(textVars[0]?.option ?? null)
  const [mainImg,         setMainImg]         = useState<number>(0)
  const [added,           setAdded]           = useState(false)

  const images = selectedVariant?.images ?? []

  // Stock for the current colour/size, minus what is already in the cart.
  const cartKey = selectedVariant && selectedSize
    ? `${product.id}:${selectedVariant.id}:${selectedSize}:${selectedText ?? 'none'}`
    : ''
  const left = effectiveStock(product, selectedVariant?.id, selectedSize || null)
  const productLines = cartItems.filter(i => i.productId === product.id)
  const sameLineQty = productLines
    .filter(i => i.variant?.id === selectedVariant?.id && i.size === selectedSize)
    .reduce((n, i) => n + i.quantity, 0)
  const productQty = productLines.reduce((n, i) => n + i.quantity, 0)
  const addable = left === null
    ? null
    : Math.max(0, Math.min(left - sameLineQty, typeof product.stock === 'number' ? product.stock - productQty : Infinity))
  const soldOut = left !== null && left <= 0
  const atLimit = addable !== null && addable <= 0
  const label = stockLabel(left)

  function handleAddToCart() {
    if (!selectedVariant || !selectedSize || atLimit) return
    addItem({
      cartKey,
      productId:   product.id,
      name:        product.name,
      variant: {
        id:        selectedVariant.id,
        color:     selectedVariant.color,
        color_hex: selectedVariant.color_hex,
        image:     images[0] ?? null,
      },
      size:        selectedSize,
      textVariant: selectedText,
      priceCents:  product.price_cents,
      maxQty:      left,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const pill = (on: boolean) =>
    `rounded-full border px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] transition-colors ${
      on ? 'border-night bg-night text-ivory' : 'border-night/40 hover:border-night'
    }`

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,440px)_minmax(0,584px)] md:justify-between">
      {/* Info / selectors (board M1: the product as a still life) */}
      <div className="order-2 flex flex-col md:order-1 md:pt-[110px]">
        <div className="text-[13px] text-earth-700">Merch</div>
        <h1 className="rd-display mt-3 text-[clamp(44px,6.3vw,76px)]">{product.name}</h1>
        <div className="rd-display mt-5 text-[40px]">{fmtEur(product.price_cents).replace(',00', '')}</div>
        {product.description && <p className="mt-5 text-[15px] leading-[1.7] text-earth-700">{product.description}</p>}

        {variants.length > 1 && (
          <fieldset className="mt-8">
            <legend className="text-[13px] text-earth-700">Colour · <span className="text-night">{selectedVariant?.color}</span></legend>
            <div className="mt-2.5 flex gap-2.5">
              {variants.map(v => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => { setSelectedVariant(v); setMainImg(0) }}
                  aria-label={v.color}
                  aria-pressed={selectedVariant?.id === v.id}
                  className={`h-9 w-9 rounded-full border transition-shadow ${selectedVariant?.id === v.id ? 'border-night ring-2 ring-night ring-offset-2 ring-offset-ivory' : 'border-night/25'}`}
                  style={{ backgroundColor: v.color_hex ?? '#ccc' }}
                />
              ))}
            </div>
          </fieldset>
        )}

        {sizes.length > 0 && (
          <fieldset className="mt-7">
            <legend className="text-[13px] text-earth-700">Size</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {sizes.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedSize(s)}
                  aria-pressed={selectedSize === s}
                  className={`${pill(selectedSize === s)} ${effectiveStock(product, selectedVariant?.id, s) === 0 ? 'line-through opacity-40' : ''}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {textVars.length > 0 && (
          <fieldset className="mt-7">
            <legend className="text-[13px] text-earth-700">Text</legend>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {textVars.map(tv => (
                <button key={tv.id} type="button" onClick={() => setSelectedText(tv.option)} aria-pressed={selectedText === tv.option} className={pill(selectedText === tv.option)}>
                  {tv.option}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {label && <p className={`mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] ${soldOut ? 'text-[#8a2a1d]' : 'text-earth-700'}`}>{label}</p>}

        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!selectedSize || !selectedVariant || atLimit}
          className="rd-italic mt-8 self-start text-[clamp(36px,3.7vw,44px)] text-club hover:underline underline-offset-[0.18em] disabled:text-earth-500 disabled:no-underline"
        >
          {soldOut ? 'Out of stock' : added ? 'Added to your cart' : atLimit ? 'All available pieces are in your cart' : 'Add to cart'}
        </button>

        {product.details && Object.keys(product.details).length > 0 && (
          <dl className="mt-10 border-t border-night/20">
            {Object.entries(product.details).map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] gap-4 border-b border-night/10 py-3 text-[14px]">
                <dt className="text-earth-500">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Gallery */}
      <div className="order-1 md:order-2">
        <div className="relative aspect-square w-full overflow-hidden bg-sand">
          {images[mainImg] ? (
            <Image key={`${selectedVariant?.id ?? 'v'}-${mainImg}`} src={images[mainImg]} alt={product.name} fill className="object-cover" preload />
          ) : (
            <div className="absolute inset-0 flex items-end p-3.5 text-[11px] uppercase tracking-[0.14em] text-earth-700">Photo coming soon</div>
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-3">
            {images.map((img, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setMainImg(i)}
                aria-label={`Photo ${i + 1}`}
                aria-pressed={i === mainImg}
                className={`relative aspect-square w-16 overflow-hidden bg-sand transition-opacity ${i === mainImg ? 'opacity-100' : 'opacity-55 hover:opacity-100'}`}
              >
                <Image src={img} alt="" fill className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
