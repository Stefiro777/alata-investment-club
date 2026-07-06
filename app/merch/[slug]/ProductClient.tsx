'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/app/components/CartContext'

type Variant = {
  id: string; color: string; color_hex: string | null; images: string[] | null; sort_order: number
}
type TextVariant = { id: string; option: string; sort_order: number }
type Product = {
  id: string; slug: string; name: string; price_cents: number
  description: string | null; sizes: string[] | null
  details: Record<string, string> | null
  product_variants: Variant[]
  product_text_variants: TextVariant[]
}

function fmtEur(cents: number) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

export default function ProductClient({ product }: { product: Product }) {
  const { addItem } = useCart()

  const variants   = [...(product.product_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const textVars   = [...(product.product_text_variants ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const sizes      = product.sizes ?? []

  const [selectedVariant, setSelectedVariant] = useState<Variant>(variants[0] ?? null as unknown as Variant)
  const [selectedSize,    setSelectedSize]    = useState<string>(sizes[0] ?? '')
  const [selectedText,    setSelectedText]    = useState<string | null>(textVars[0]?.option ?? null)
  const [mainImg,         setMainImg]         = useState<number>(0)
  const [added,           setAdded]           = useState(false)

  const images = selectedVariant?.images ?? []

  function handleAddToCart() {
    if (!selectedVariant || !selectedSize) return
    const cartKey = `${product.id}:${selectedVariant.id}:${selectedSize}:${selectedText ?? 'none'}`
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
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-6xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">

          {/* Gallery */}
          <div className="flex gap-3">
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex flex-col gap-2 w-16">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setMainImg(i)}
                    className={`relative aspect-square w-16 overflow-hidden border-2 transition-colors ${i === mainImg ? 'border-forest' : 'border-transparent'}`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
            {/* Main image */}
            <div className="flex-1 relative aspect-[3/4] bg-gray-100 overflow-hidden">
              {images[mainImg] ? (
                <Image
                  src={images[mainImg]}
                  alt={product.name}
                  fill
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-gray-300 text-xs uppercase tracking-widest">No image</span>
                </div>
              )}
            </div>
          </div>

          {/* Info / selectors */}
          <div className="flex flex-col gap-6">
            <div>
              <h1 className="font-['Cormorant_Garamond',serif] text-4xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>
              <p className="text-2xl font-semibold text-gray-900 mt-2">{fmtEur(product.price_cents)}</p>
            </div>

            {product.description && (
              <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
            )}

            {/* Color */}
            {variants.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
                  Colore — <span className="text-gray-900">{selectedVariant?.color}</span>
                </p>
                <div className="flex gap-2">
                  {variants.map(v => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v); setMainImg(0) }}
                      title={v.color}
                      className={`w-8 h-8 border-2 transition-all ${selectedVariant?.id === v.id ? 'border-forest scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                      style={{ backgroundColor: v.color_hex ?? '#ccc' }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Size */}
            {sizes.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Taglia</p>
                <div className="flex gap-2 flex-wrap">
                  {sizes.map(s => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`px-4 py-2 text-sm font-semibold uppercase border transition-colors ${
                        selectedSize === s
                          ? 'bg-forest text-white border-forest'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-forest'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Text variant */}
            {textVars.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Variante testo</p>
                <div className="flex gap-2 flex-wrap">
                  {textVars.map(tv => (
                    <button
                      key={tv.id}
                      onClick={() => setSelectedText(tv.option)}
                      className={`px-4 py-2 text-sm font-semibold border transition-colors ${
                        selectedText === tv.option
                          ? 'bg-forest text-white border-forest'
                          : 'bg-white text-gray-900 border-gray-300 hover:border-forest'
                      }`}
                    >
                      {tv.option}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || !selectedVariant}
              className={`w-full py-4 text-sm font-semibold uppercase tracking-widest transition-colors ${
                added
                  ? 'bg-[#123a2d] text-white'
                  : 'bg-forest hover:bg-forest-deep text-white disabled:bg-gray-200 disabled:text-gray-400'
              }`}
            >
              {added ? 'AGGIUNTO ✓' : 'AGGIUNGI AL CARRELLO'}
            </button>

            {/* Details */}
            {product.details && Object.keys(product.details).length > 0 && (
              <div className="border-t border-gray-100 pt-6 space-y-2">
                {Object.entries(product.details).map(([k, v]) => (
                  <div key={k} className="flex gap-4 text-sm">
                    <span className="w-28 text-gray-400 uppercase tracking-wide text-xs font-semibold flex-shrink-0">{k}</span>
                    <span className="text-gray-700">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
