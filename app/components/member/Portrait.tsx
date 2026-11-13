import { initialsOf } from '@/lib/initials'

/** sm: a row of a dense list; md: the People list; lg: the head of a sheet. */
const SIZES = {
  sm: 'h-[42px] w-[32px] text-[9px]',
  md: 'h-[57px] w-[44px] text-[11px]',
  lg: 'h-[93px] w-[72px] text-[14px]',
} as const

export type PortraitSize = keyof typeof SIZES

/** A member's photo, or their initials on a sand square when there is none. */
export default function Portrait({ src, name, size = 'md' }: { src?: string | null; name: string; size?: PortraitSize }) {
  return (
    <div className={`${SIZES[size]} shrink-0 overflow-hidden bg-[#e8e1d2]`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
      ) : (
        <span className="rd-eyebrow flex h-full items-center justify-center text-earth-500">{initialsOf(name)}</span>
      )}
    </div>
  )
}
