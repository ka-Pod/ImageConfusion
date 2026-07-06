import { expect, test, describe } from 'bun:test'
import { gilbert2d } from './gilbert'

describe('gilbert2d', () => {
  test('generates correct number of coordinates', () => {
    const curve = gilbert2d(10, 10)
    expect(curve.length).toBe(100)
  })

  test('all coordinates are unique', () => {
    const curve = gilbert2d(16, 16)
    const set = new Set(curve.map(([x, y]) => `${x},${y}`))
    expect(set.size).toBe(256)
  })

  test('coordinates are within bounds', () => {
    const w = 20
    const h = 15
    const curve = gilbert2d(w, h)
    for (const [x, y] of curve) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(w)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(h)
    }
  })

  test('handles 1xN rectangle', () => {
    const curve = gilbert2d(1, 10)
    expect(curve.length).toBe(10)
    for (const [x, y] of curve) {
      expect(x).toBe(0)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThan(10)
    }
  })

  test('handles Nx1 rectangle', () => {
    const curve = gilbert2d(10, 1)
    expect(curve.length).toBe(10)
    for (const [x, y] of curve) {
      expect(y).toBe(0)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThan(10)
    }
  })

  test('handles 1x1', () => {
    const curve = gilbert2d(1, 1)
    expect(curve.length).toBe(1)
    expect(curve[0]).toEqual([0, 0])
  })

  test('handles non-square rectangles where width > height', () => {
    const curve = gilbert2d(30, 10)
    expect(curve.length).toBe(300)
    const set = new Set(curve.map(([x, y]) => `${x},${y}`))
    expect(set.size).toBe(300)
  })

  test('handles non-square rectangles where height > width', () => {
    const curve = gilbert2d(10, 30)
    expect(curve.length).toBe(300)
    const set = new Set(curve.map(([x, y]) => `${x},${y}`))
    expect(set.size).toBe(300)
  })

  test('curve forms a valid path (adjacent points are neighbors)', () => {
    const curve = gilbert2d(8, 8)
    for (let i = 1; i < curve.length; i++) {
      const [px, py] = curve[i - 1]
      const [cx, cy] = curve[i]
      const dist = Math.abs(cx - px) + Math.abs(cy - py)
      expect(dist).toBe(1)
    }
  })
})
