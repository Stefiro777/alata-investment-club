'use client'

import { useRef, useEffect } from 'react'

interface UseRevealOptions {
  threshold?: number
  rootMargin?: string
}

/**
 * Attaches an IntersectionObserver to the returned ref.
 * When the element becomes visible, it adds the `.in-view` class,
 * which CSS can use to trigger staggered animations via
 * `[data-reveal-index="0/1/2"]` selectors.
 */
export function useReveal<T extends HTMLElement = HTMLElement>(
  options: UseRevealOptions = {}
) {
  const { threshold = 0.15, rootMargin = '0px' } = options
  const ref = useRef<T>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in-view')
          observer.disconnect()
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return ref
}
