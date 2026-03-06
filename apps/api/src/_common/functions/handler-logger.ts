import fs from 'fs'
import path from 'path'
import { ConfigService } from '@nestjs/config'
import { Logger } from '@nestjs/common'

export function toSafeHandlerName(handler: string): string {
  return handler.replace(/[^a-zA-Z0-9-_]/g, '_').toLowerCase()
}

function ensureDir(dir: string) {
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o777 })
  } catch (err) {
    Logger.warn(`Could not create log directory ${dir}: ${(err as Error).message}`, 'ensureDir')
    throw err
  }
}

function stripAnsiCodes(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
}

function rotateFile(logFile: string, maxFiles: number) {
  for (let index = maxFiles - 1; index >= 1; index--) {
    const source = `${logFile}.${index}`
    const destination = `${logFile}.${index + 1}`

    if (fs.existsSync(source)) {
      fs.renameSync(source, destination)
    }
  }

  fs.renameSync(logFile, `${logFile}.1`)
}

function rotateHandlerLogIfNeeded(logFile: string, maxSizeBytes: number, maxFiles: number) {
  if (!fs.existsSync(logFile)) {
    return
  }

  const stats = fs.statSync(logFile)
  if (stats.size < maxSizeBytes) {
    return
  }

  try {
    const oldestArchive = `${logFile}.${maxFiles}`
    if (fs.existsSync(oldestArchive)) {
      fs.unlinkSync(oldestArchive)
    }

    rotateFile(logFile, maxFiles)
  } catch (err) {
    Logger.error(`Could not rotate handler log file ${logFile}: ${(err as Error).message}`, rotateHandlerLogIfNeeded.name)
  }
}

export function createHandlerLogger(config: ConfigService, handler: string) {
  const safeHandler = toSafeHandlerName(handler)
  const logDir = config.get('cron.logDirectory') || path.join(process.cwd(), 'logs', 'handlers')
  const logFile = path.join(logDir, `${safeHandler}.log`)
  const logRotateMaxSizeBytes = config.get<number>('cron.logRotateMaxSizeBytes') || 10 * 1024 * 1024
  const logRotateMaxFiles = config.get<number>('cron.logRotateMaxFiles') || 5

  let stream: fs.WriteStream | null = null
  let streamError: Error | null = null

  try {
    ensureDir(logDir)
    rotateHandlerLogIfNeeded(logFile, logRotateMaxSizeBytes, logRotateMaxFiles)
    stream = fs.createWriteStream(logFile, { flags: 'a' })

    stream.on('error', (err) => {
      streamError = err
      Logger.error(`Error writing to handler log file ${logFile}: ${err.message}`, createHandlerLogger.name)
    })

    Logger.debug(`Handler logger created for <${handler}> at ${logFile}`, createHandlerLogger.name)
  } catch (err) {
    streamError = err as Error
    Logger.error(`Failed to create handler logger for <${handler}>: ${(err as Error).message}`, createHandlerLogger.name)
  }

  const log = (msg: string) => {
    if (stream && !streamError) {
      stream.write(`${stripAnsiCodes(msg)}`)
    }
  }

  const error = (msg: string) => {
    if (stream && !streamError) {
      stream.write(`⚠ ${stripAnsiCodes(msg)}`)
    }
  }

  const jump = (quantity: number) => {
    if (stream && !streamError) {
      stream.write(`${stripAnsiCodes('\n'.repeat(quantity))}`)
    }
  }

  return {
    log: (msg: string) => log(msg),
    error: (msg: string) => error(msg),
    close: () => {
      jump(2)
      stream?.close()
    },
    file: logFile,
  }
}
