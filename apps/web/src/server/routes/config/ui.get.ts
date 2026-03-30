import { mkdir, readFile, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { defineEventHandler } from 'h3'
import { parse } from 'yaml'
import { DefaultMenuParts } from '../../../constants/variables'
import { getDefaultMenuEntries } from '../../../constants/defaultMenuEntries'

type MenuEntry = Record<string, unknown>
type MenuPart = Record<string, unknown>
type IdentityColumnEntry = Record<string, unknown>

type UiConfigPayload = {
  menus: {
    entries: MenuEntry[]
    parts: MenuPart[]
    useDefaultEntries?: boolean
  }
  identitiesColumns: {
    entries: IdentityColumnEntry[]
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true
    if (['false', '0', 'no', 'off'].includes(normalized)) return false
  }
  return undefined
}

async function readYamlFile(path: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, 'utf8')
    return (parse(raw || '{}') as Record<string, unknown>) || {}
  } catch {
    return {}
  }
}

let defaultMenuEntriesJsonGenerated = false

async function ensureDefaultMenuDataJson(): Promise<void> {
  if (defaultMenuEntriesJsonGenerated) return
  defaultMenuEntriesJsonGenerated = true

  const configDir = path.resolve(process.cwd(), 'config')
  const outputPath = path.join(configDir, 'default-menu-data.json')

  try {
    await mkdir(configDir, { recursive: true })

    const entries = getDefaultMenuEntries()
    const parts = DefaultMenuParts

    const payload = {
      _meta: {
        generated: true,
        generatedAt: new Date().toISOString(),
        generatedBy: 'sesame-orchestrator',
        note: 'FICHIER AUTO-GÉNÉRÉ AU DÉMARRAGE. NE PAS MODIFIER.',
      },
      parts,
      entries,
    }

    await writeFile(outputPath, JSON.stringify(payload, null, 2), 'utf8')
  } catch (error) {
    console.debug('[config/ui] Unable to write default menu data json', error)
  }
}

export default defineEventHandler(async () => {
  await ensureDefaultMenuDataJson()

  const menusFile = await readYamlFile('./config/menus.yml')
  const identitiesColumnsFile = await readYamlFile('./config/identities-columns.yml')

  return {
    menus: {
      entries: asArray(menusFile.entries),
      parts: asArray(menusFile.parts),
      useDefaultEntries: asBoolean(menusFile.useDefaultEntries),
    },
    identitiesColumns: {
      entries: asArray(identitiesColumnsFile.entries),
    },
  } satisfies UiConfigPayload
})
