import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { FlatCompat } from '@eslint/eslintrc'
import nuxt from '@nuxt/eslint-config'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const compatRoot = new FlatCompat({ baseDirectory: __dirname })
const compatApi = new FlatCompat({ baseDirectory: path.join(__dirname, 'apps/api') })

function scopeFilesToWeb(files) {
  if (!Array.isArray(files) || files.length === 0) {
    return ['apps/web/**/*.{ts,js,vue}']
  }
  return files.map((f) => {
    if (typeof f !== 'string') return f
    if (f.startsWith('!')) return `!apps/web/${f.slice(1)}`
    if (f.startsWith('apps/web/')) return f
    return `apps/web/${f}`
  })
}

const webConfigs = (await nuxt()).map((c) => ({
  ...c,
  files: scopeFilesToWeb(c.files),
}))

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.output/**', '**/.nuxt/**', '**/coverage/**'],
  },

  // API (NestJS)
  ...compatApi.config(require('./apps/api/.eslintrc.js')).map((c) => ({
    ...c,
    files: ['apps/api/**/*.{ts,js}'],
  })),

  // Web (Nuxt)
  ...webConfigs,

  // Fallback root rules for shared TS/JS (if any)
  ...compatRoot.config(require('./.eslintrc.js')).map((c) => ({
    ...c,
    files: ['packages/**/*.{ts,js}', 'scripts/**/*.{ts,js}'],
  })),
]

