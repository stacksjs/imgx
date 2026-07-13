import type { ImageData } from './image-data'
import { flip, flop, rotate90, rotate180, rotate270 } from './transforms'

/**
 * Read the EXIF orientation (tag 0x0112) from a JPEG buffer.
 *
 * Walks the JPEG marker stream for an APP1 "Exif" segment, then parses the
 * TIFF header inside it (either byte order) and scans IFD0 for the
 * orientation tag. Returns 1 (upright) when the file has no EXIF, no
 * orientation tag, or anything malformed — never throws.
 */
export function jpegExifOrientation(buffer: Uint8Array): number {
  if (buffer.length < 4 || buffer[0] !== 0xFF || buffer[1] !== 0xD8)
    return 1

  let p = 2
  while (p + 4 <= buffer.length) {
    if (buffer[p] !== 0xFF)
      return 1
    while (p < buffer.length && buffer[p] === 0xFF) p++
    const marker = buffer[p++]

    // SOS/EOI: image data follows — no EXIF past this point.
    if (marker === 0xDA || marker === 0xD9)
      return 1
    // Standalone markers carry no length.
    if (marker >= 0xD0 && marker <= 0xD7)
      continue
    if (p + 2 > buffer.length)
      return 1
    const segLen = (buffer[p] << 8) | buffer[p + 1]
    if (segLen < 2 || p + segLen > buffer.length)
      return 1

    if (marker === 0xE1 && segLen >= 10
      && buffer[p + 2] === 0x45 && buffer[p + 3] === 0x78 // "Ex"
      && buffer[p + 4] === 0x69 && buffer[p + 5] === 0x66 // "if"
      && buffer[p + 6] === 0x00 && buffer[p + 7] === 0x00) {
      return orientationFromTiff(buffer.subarray(p + 8, p + segLen))
    }

    p += segLen
  }
  return 1
}

/** Parse a TIFF blob (EXIF payload) and return IFD0's orientation, or 1. */
function orientationFromTiff(tiff: Uint8Array): number {
  if (tiff.length < 8)
    return 1

  let littleEndian: boolean
  if (tiff[0] === 0x49 && tiff[1] === 0x49)
    littleEndian = true
  else if (tiff[0] === 0x4D && tiff[1] === 0x4D)
    littleEndian = false
  else
    return 1

  const u16 = (off: number): number => littleEndian
    ? tiff[off] | (tiff[off + 1] << 8)
    : (tiff[off] << 8) | tiff[off + 1]
  const u32 = (off: number): number => littleEndian
    ? (tiff[off] | (tiff[off + 1] << 8) | (tiff[off + 2] << 16) | (tiff[off + 3] << 24)) >>> 0
    : (((tiff[off] << 24) | (tiff[off + 1] << 16) | (tiff[off + 2] << 8) | tiff[off + 3])) >>> 0

  if (u16(2) !== 42)
    return 1

  const ifdOffset = u32(4)
  if (ifdOffset + 2 > tiff.length)
    return 1

  const entryCount = u16(ifdOffset)
  for (let i = 0; i < entryCount; i++) {
    const entry = ifdOffset + 2 + i * 12
    if (entry + 12 > tiff.length)
      return 1
    if (u16(entry) === 0x0112) {
      const value = u16(entry + 8)
      return value >= 1 && value <= 8 ? value : 1
    }
  }
  return 1
}

/**
 * Re-orient decoded pixels so the image displays upright, per the EXIF
 * orientation value (1-8). Returns the input untouched for 1 (or anything
 * out of range).
 */
export function applyExifOrientation(image: ImageData, orientation: number): ImageData {
  switch (orientation) {
    case 2: return flop(image)
    case 3: return rotate180(image)
    case 4: return flip(image)
    case 5: return rotate90(flip(image)) // transpose
    case 6: return rotate90(image)
    case 7: return rotate270(flip(image)) // transverse
    case 8: return rotate270(image)
    default: return image
  }
}
