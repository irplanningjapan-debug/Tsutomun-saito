// Uploaded photos were being stored as raw base64 data URLs straight from FileReader —
// a modern smartphone photo easily produces a multi-MB base64 string, which blew past
// Supabase's statement timeout when INSERTed into the activities.image_url TEXT column.
// This resizes/re-encodes on the client before it ever reaches state or the network.

const MAX_DIMENSION = 1000
const TARGET_MAX_BYTES = 200_000 // ~200KB, matches the requested 100–200KB budget
const MIN_JPEG_QUALITY = 0.4
const INITIAL_JPEG_QUALITY = 0.7

/** Rough byte size of a base64 data URL, without allocating the decoded buffer. */
function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1)
  return Math.floor((base64.length * 3) / 4)
}

/**
 * Reads an image file, downscales it so its longest side is at most `MAX_DIMENSION`px,
 * and re-encodes it as JPEG, stepping quality down until the result fits within
 * `TARGET_MAX_BYTES` (or quality bottoms out). Returns null if the file cannot be
 * decoded as an image, so callers can fall back to submitting without a photo instead
 * of failing the whole submission.
 */
export async function compressImageFile(file: File): Promise<string | null> {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'))
      reader.readAsDataURL(file)
    })

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('Failed to decode image'))
      img.src = dataUrl
    })

    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.width, image.height))
    const width = Math.max(1, Math.round(image.width * scale))
    const height = Math.max(1, Math.round(image.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    // Flatten onto white first so transparent PNGs re-encoded as JPEG don't turn black.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(image, 0, 0, width, height)

    let quality = INITIAL_JPEG_QUALITY
    let output = canvas.toDataURL('image/jpeg', quality)
    while (estimateDataUrlBytes(output) > TARGET_MAX_BYTES && quality > MIN_JPEG_QUALITY) {
      quality -= 0.1
      output = canvas.toDataURL('image/jpeg', quality)
    }

    return output
  } catch (error) {
    console.error('[v0] Failed to compress uploaded image:', error)
    return null
  }
}

export { TARGET_MAX_BYTES as IMAGE_TARGET_MAX_BYTES, estimateDataUrlBytes }
