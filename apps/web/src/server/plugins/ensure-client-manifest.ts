import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

export default defineNitroPlugin(() => {
  const rootDir = process.cwd()
  const clientManifestPath = resolve(rootDir, '.nuxt/dist/server/client.manifest.mjs')

  if (existsSync(clientManifestPath)) {
    return
  }

  mkdirSync(resolve(rootDir, '.nuxt/dist/server'), { recursive: true })
  writeFileSync(clientManifestPath, 'export default {}\n')
})
