import { gilbert2d, type Point } from './gilbert'

function computeOffset(total: number): number {
  return Math.round(((Math.sqrt(5) - 1) / 2) * total)
}

export interface ConfuseOptions {
  data: Uint8Array
  width: number
  height: number
  channels: number
}

function pixelByteIndex(p: Point, width: number, channels: number): number {
  return channels * (p[0] + p[1] * width)
}

export function encryptPixels(opts: ConfuseOptions): Uint8Array {
  const { data, width, height, channels } = opts
  const total = width * height
  const curve = gilbert2d(width, height)
  const offset = computeOffset(total)
  const out = new Uint8Array(data.length)

  for (let i = 0; i < total; i++) {
    const src = pixelByteIndex(curve[i], width, channels)
    const dst = pixelByteIndex(curve[(i + offset) % total], width, channels)
    out.set(data.subarray(src, src + channels), dst)
  }

  return out
}

export function decryptPixels(opts: ConfuseOptions): Uint8Array {
  const { data, width, height, channels } = opts
  const total = width * height
  const curve = gilbert2d(width, height)
  const offset = computeOffset(total)
  const out = new Uint8Array(data.length)

  for (let i = 0; i < total; i++) {
    const src = pixelByteIndex(curve[(i + offset) % total], width, channels)
    const dst = pixelByteIndex(curve[i], width, channels)
    out.set(data.subarray(src, src + channels), dst)
  }

  return out
}
