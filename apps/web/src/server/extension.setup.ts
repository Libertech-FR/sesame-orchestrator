import { existsSync, readFileSync } from 'fs'
import { dirname, join } from 'path'
import { parse } from 'yaml'
import * as consola from 'consola'

const appList: string[] = []

export const EXTENSION_FILE_INFO = 'extension.yml'
export const EXTENSIONS_FILE_PATH = join(dirname(__dirname), '/../extensions/list.yml')

export function parseExtensionsList(): any[] {
  const data = readFileSync(EXTENSIONS_FILE_PATH, 'utf8')
  const yml = parse(data)
  return yml.list
}

export function extensionParseFile(path: string): any {
  consola.info(`[Extension] Parsing extension file: ${path}/${EXTENSION_FILE_INFO}`)
  const data = readFileSync(`${path}/${EXTENSION_FILE_INFO}`, 'utf8')
  return parse(data)
}

// noinspection JSUnusedGlobalSymbols
export default function (): string[] {
  consola.info(`[Extension] Setting up extensions in <${EXTENSIONS_FILE_PATH}>...`)
  try {
    if (existsSync(EXTENSIONS_FILE_PATH)) {
      const list = parseExtensionsList()
      for (const extension of list) {
        const extensionPath = `${dirname(dirname(__dirname))}/extensions/${extension.path}`
        const extensionFile = extensionParseFile(extensionPath)

        consola.info(`[Extension] Found extension: ${extensionFile?.information?.name} (enabled: ${extension.enabled})`)

        if (extension.enabled) {
          if (extensionFile.settings.app.target) {
            const extensionAppTarget = `${extensionPath}/${extensionFile.settings.app.target}`
            appList.push(`${extensionAppTarget}`) // TODO: target dev and prod parameters
          }
        }
      }
    }
    return appList
  } catch (err) {
    console.error(err) //TODO: universal logger
    process.exit(1)
  }
}
