import { readFile } from 'node:fs/promises'
import { defineEventHandler } from 'h3'
import { parse } from 'yaml'

type MenuEntry = Record<string, unknown>
type MenuPart = Record<string, unknown>
type IdentityColumnEntry = Record<string, unknown>

type UiConfigPayload = {
  menus: {
    entries: MenuEntry[]
    parts: MenuPart[]
  }
  identitiesColumns: {
    entries: IdentityColumnEntry[]
  }
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

async function readYamlFile(path: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, 'utf8')
    return (parse(raw || '{}') as Record<string, unknown>) || {}
  } catch {
    return {}
  }
}

export default defineEventHandler(async () => {
  const menusFile = await readYamlFile('./config/menus.yml')
  const identitiesColumnsFile = await readYamlFile('./config/identities-columns.yml')

  return {
    menus: {
      entries: asArray(menusFile.entries),
      parts: asArray(menusFile.parts),
    },
    identitiesColumns: {
      entries: asArray(identitiesColumnsFile.entries),
    },
  } satisfies UiConfigPayload
})
