import { appendFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
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
  return join(logDir(), `${dateStamp()}.log`)
}

async function ensureLogDir(): Promise<string> {
  const paths = [join(process.cwd(), 'logs'), join(tmpdir(), 'logs')]
  for (const dir of paths) {
    if (!existsSync(dir)) {
      try {
        await mkdir(dir, { recursive: true })
        return dir
      } catch {
        continue
      }
    }
    return dir
  }
  throw new Error('cannot create log directory')
}

function logDir(): string {
  const paths = [join(process.cwd(), 'logs'), join(tmpdir(), 'logs')]
  for (const dir of paths) {
    if (existsSync(dir)) return dir
  }
  return join(process.cwd(), 'logs')
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
