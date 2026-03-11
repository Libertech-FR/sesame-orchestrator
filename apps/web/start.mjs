import { spawn } from 'child_process'
import { createHash } from 'crypto'
import dotenv from 'dotenv'
import consola from 'consola'
import { readFileSync, writeFileSync } from 'fs'

dotenv.config()

function hashEnv() {
  const sum = createHash('sha256')
  // Inclure toutes les variables de config metier et les metadonnees package
  const relevantKeys = Object.keys(process.env)
    .filter((key) => key.startsWith('SESAME_') || key.startsWith('npm_package') || key === 'BUILD_VERSION')
    .sort()
  const env = Object.fromEntries(relevantKeys.map((key) => [key, process.env[key] ?? '']))
  sum.update(JSON.stringify(env))
  return sum.digest('hex')
}

function readHash() {
  try {
    return readFileSync('.env.hash', 'utf8').trim()
  } catch (err) {
    return ''
  }
}

function buildNuxt() {
  return new Promise((resolve, reject) => {
    consola.info('Building Nuxt...')
    const building = spawn('yarn', ['build'], { env: process.env, stdio: 'inherit' })

    building.on('close', (code) => {
      consola.info(`child process exited with code ${code}`)
      if (code > 0) return reject(new Error(`Nuxt build failed with code ${code}`))

      consola.info('Hashing .env...')
      writeFileSync('.env.hash', hashEnv())
      return resolve()
    })
  })
}

;(async () => {
  if (/yes|1|on|true/i.test(`${process.env.SESAME_HTTPS_ENABLED}`)) {
    try {
      process.env.NITRO_SSL_KEY = readFileSync(`${process.env.SESAME_HTTPS_PATH_KEY}`, 'utf8')
      process.env.NITRO_SSL_CERT = readFileSync(`${process.env.SESAME_HTTPS_PATH_CERT}`, 'utf8')
      consola.info('[Nuxt] SSL certificates loaded successfully')
    } catch (error) {
      consola.warn('[Nuxt] Error while reading SSL certificates', error)
    }
  }

  const currentHash = hashEnv()
  const previousHash = readHash()
  if (process.env.ALLOW_RUNTIME_BUILD === 'true' && currentHash !== previousHash) {
    consola.warn('Hash changed, rebuilding...')
    consola.info(`Hash: ${currentHash}, Previous: ${previousHash}`)
    await buildNuxt()
  }

  consola.info('Starting Nuxt...')
  const starting = spawn('yarn', ['start'], { env: process.env, stdio: 'inherit' })

  const forwardSignal = (signal) => {
    if (!starting.killed) starting.kill(signal)
  }
  process.on('SIGTERM', () => forwardSignal('SIGTERM'))
  process.on('SIGINT', () => forwardSignal('SIGINT'))

  starting.on('close', (code, signal) => {
    if (signal) {
      consola.warn(`Nuxt stopped by signal ${signal}`)
      process.exit(0)
    }
    const exitCode = typeof code === 'number' ? code : 1
    consola.warn(`child process exited with code ${exitCode}`)
    process.exit(exitCode)
  })
})()
