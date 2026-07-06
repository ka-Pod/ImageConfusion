import { expect, test, describe } from 'bun:test'
import { encryptPixels, decryptPixels } from './confuse'

function createTestImage(width: number, height: number, channels: number): Uint8Array {
  const data = new Uint8Array(width * height * channels)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = channels * (x + y * width)
      data[idx] = (x * 37 + y * 53) % 256
      if (channels > 1) data[idx + 1] = (x * 71 + y * 97) % 256
      if (channels > 2) data[idx + 2] = (x * 13 + y * 19) % 256
      if (channels > 3) data[idx + 3] = 255
    }
  }
  return data
}

describe('encryptPixels / decryptPixels', () => {
  test('encrypt then decrypt returns identical data (RGBA)', () => {
    const width = 16
    const height = 16
    const channels = 4
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    expect(encrypted.length).toBe(original.length)

    const decrypted = decryptPixels({ data: encrypted, width, height, channels })
    expect(decrypted).toEqual(original)
  })

  test('encrypt then decrypt returns identical data (RGB)', () => {
    const width = 20
    const height = 15
    const channels = 3
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    const decrypted = decryptPixels({ data: encrypted, width, height, channels })
    expect(decrypted).toEqual(original)
  })

  test('encrypted data differs from original', () => {
    const width = 10
    const height = 10
    const channels = 4
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    const someDiff = encrypted.some((v, i) => v !== original[i])
    expect(someDiff).toBe(true)
  })

  test('handles 1x1 image', () => {
    const width = 1
    const height = 1
    const channels = 4
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    const decrypted = decryptPixels({ data: encrypted, width, height, channels })
    expect(decrypted).toEqual(original)
  })

  test('handles non-square image (wide)', () => {
    const width = 30
    const height = 10
    const channels = 4
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    const decrypted = decryptPixels({ data: encrypted, width, height, channels })
    expect(decrypted).toEqual(original)
  })

  test('handles non-square image (tall)', () => {
    const width = 10
    const height = 30
    const channels = 4
    const original = createTestImage(width, height, channels)

    const encrypted = encryptPixels({ data: original, width, height, channels })
    const decrypted = decryptPixels({ data: encrypted, width, height, channels })
    expect(decrypted).toEqual(original)
  })
})
