'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'

type Direction = 'up' | 'down' | 'left' | 'right' | 'none'

interface RevealProps {
  children: ReactNode
  delay?: number          // ms
  duration?: number       // ms
  direction?: Direction
  distance?: number       // px
  threshold?: number      // 0-1
  className?: string
  style?: CSSProperties
  as?: keyof JSX.IntrinsicElements
}

export default function Reveal({
  children,
  delay = 0,
  duration = 600,
  direction = 'up',
  distance = 28,
  threshold = 0.15,
  className = '',
  style,
  as: Tag = 'div',
}: RevealProps) {
  const ref = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  const translateMap: Record<Direction, string> = {
    up: `translateY(${distance}px)`,
    down: `translateY(-${distance}px)`,
    left: `translateX(${distance}px)`,
    right: `translateX(-${distance}px)`,
    none: 'none',
  }

  const hiddenStyle: CSSProperties = {
    opacity: 0,
    transform: translateMap[direction],
    transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
    willChange: 'opacity, transform',
  }

  const visibleStyle: CSSProperties = {
    opacity: 1,
    transform: 'none',
    transition: `opacity ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms, transform ${duration}ms cubic-bezier(0.22,1,0.36,1) ${delay}ms`,
  }

  return (
    // @ts-expect-error dynamic tag
    <Tag
      ref={ref}
      className={className}
      style={{ ...(visible ? visibleStyle : hiddenStyle), ...style }}
    >
      {children}
    </Tag>
  )
}
