import { Link2 } from 'lucide-react'

// Branded fallback shown wherever an organizer has not uploaded a photo, instead of
// leaving a blank/gray box or falling back to an unrelated stock image. Meant to be
// dropped in as a sibling of an <Image fill /> inside the same `relative` wrapper.
export function NoImagePlaceholder({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary via-sky-600 to-amber-400 ${className}`}
    >
      <Link2 aria-hidden className="pointer-events-none absolute -bottom-4 -right-4 text-white/10" size={compact ? 60 : 104} strokeWidth={1.5} />
      <div className="relative flex flex-col items-center gap-1.5 px-2 text-center">
        <span
          className={`grid place-items-center rounded-xl bg-white/15 font-black text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm ${compact ? 'size-7 text-[11px]' : 'size-11 text-base'}`}
        >
          K
        </span>
        {!compact && (
          <div>
            <p className="text-[10px] font-bold leading-tight text-white/85">みやざきKNOT</p>
            <p className="text-[11px] font-black leading-tight tracking-wide text-white">NO IMAGE</p>
          </div>
        )}
      </div>
    </div>
  )
}
