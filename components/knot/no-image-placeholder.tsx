import Image from 'next/image'

// Branded fallback shown wherever an organizer has not uploaded a photo
export function NoImagePlaceholder({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center overflow-hidden bg-[#eaf3ea] ${className}`}>
      <Image
        src="/tsutomun-no-image.jpg"
        alt="つとむん NO IMAGE"
        fill
        className="object-contain object-center p-2"
        sizes="(max-width: 768px) 100vw, 33vw"
        priority={false}
      />
    </div>
  )
}
