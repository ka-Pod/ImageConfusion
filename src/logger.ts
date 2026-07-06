import { appendFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

type LogLevel = 'INFO' | 'WARN' | 'ERROR'

function dateStamp(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function timeStamp(): string {
  return new Date().toISOString()
}

function logFilePath(): string {
  return join(process.cwd(), 'logs', `${dateStamp()}.log`)
}

async function ensureLogDir(): Promise<void> {
  const dir = join(process.cwd(), 'logs')
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export async function log(level: LogLevel, message: string): Promise<void> {
  const line = `[${timeStamp()}] [${level}] ${message}\n`
  console.log(line.trimEnd())

  try {
    await ensureLogDir()
    await appendFile(logFilePath(), line, 'utf-8')
  } catch {
    // silently ignore log write errors
  }
}

export function logSync(level: LogLevel, message: string): void {
  const line = `[${timeStamp()}] [${level}] ${message}\n`
  console.log(line.trimEnd())

  try {
    const dir = join(process.cwd(), 'logs')
    if (!existsSync(dir)) {
      return
    }
  } catch {
    // silently ignore
  }
}
