import { expect, test, describe, afterAll } from 'bun:test'
import { rm, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const LOG_DIR = join(process.cwd(), 'logs')

afterAll(async () => {
  const { readdir } = await import('node:fs/promises')
  if (existsSync(LOG_DIR)) {
    const files = await readdir(LOG_DIR)
    for (const f of files) {
      if (f.endsWith('.log')) {
        await rm(join(LOG_DIR, f), { force: true })
      }
    }
  }
})

describe('logger', () => {
  test('log writes to a date-partitioned file', async () => {
    const { log } = await import('./logger')
    await log('INFO', 'test log message')
    const today = new Date().toISOString().slice(0, 10)
    const logFile = join(LOG_DIR, `${today}.log`)
    expect(existsSync(logFile)).toBe(true)
  })

  test('log file contains the message with level', async () => {
    const { log } = await import('./logger')
    const tag = `test-${Date.now()}`
    await log('WARN', tag)

    const today = new Date().toISOString().slice(0, 10)
    const logFile = join(LOG_DIR, `${today}.log`)
    const content = await readFile(logFile, 'utf-8')
    expect(content).toContain('[WARN]')
    expect(content).toContain(tag)
  })

  test('logSync writes synchronously', () => {
    const { logSync } = require('./logger') as typeof import('./logger')
    const tag = `sync-test-${Date.now()}`
    logSync('ERROR', tag)

    const today = new Date().toISOString().slice(0, 10)
    const logFile = join(LOG_DIR, `${today}.log`)
    expect(existsSync(logFile)).toBe(true)
    const content = require('node:fs').readFileSync(logFile, 'utf-8')
    expect(content).toContain('[ERROR]')
    expect(content).toContain(tag)
  })
})
