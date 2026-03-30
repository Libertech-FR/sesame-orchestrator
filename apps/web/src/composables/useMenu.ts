import type { BadgeItem, MenuItem } from '~/constants/types'
import { DefaultMenuParts, MaxMenuBadgeCount } from '~/constants/variables'
import qs from 'qs'
import type { useIdentityStateStore } from '~/stores/identityState'
import { getDefaultMenuEntries } from '~/constants/defaultMenuEntries'
import { sort } from 'radash'
import { AC_ADMIN_ROLE } from './useAccessControl'

const config = useAppConfig() as any

type useMenuReturnType = {
  getMenu: () => MenuItem[]
  menuParts: Ref<MenuPartItem[]>
  getMenuByPart: (part: string) => MenuItem[]
  initialize: () => Promise<void>
}

type MenuPartItem = {
  label: string
  position: number
}

function useMenu(identityStateStore: ReturnType<typeof useIdentityStateStore>): useMenuReturnType {
  const menuParts = ref<MenuPartItem[]>(DefaultMenuParts)
  const useDefaultEntries = config?.menus?.useDefaultEntries !== false
  const menuEntries = (config?.menus?.entries as any[]) || []
  const { hasPermission, hasPermissionStartsWith } = useAccessControl()
  const $auth = useAuth()
  const userRoles = ($auth.user?.roles as string[]) || []
  const isAdmin = userRoles.includes(AC_ADMIN_ROLE)

  function getRequiredAcls(entry: any): string[] {
    const directAcls = Array.isArray(entry?.acl) ? entry.acl : []
    if (directAcls.length > 0) return directAcls

    // Compatibilité : ancien champ `_acl` (string) -> `acl: [string]`
    const legacyAcl = typeof entry?._acl === 'string' ? entry._acl : ''
    return legacyAcl ? [legacyAcl] : []
  }

  function normalizeNameFromLabel(label: string): string {
    // Auto-remplissage côté déploiement :
    // - minuscules
    // - espaces -> `_`
    // - le reste est conservé tel quel
    return label.toLowerCase().trim().replace(/\s+/g, '_')
  }

  if (config?.menus?.parts) {
    const overrideParts = config.menus.parts as any[]
    const mergedParts: MenuPartItem[] = [...menuParts.value]

    for (const overridePart of overrideParts) {
      const overrideLabel = typeof overridePart?.label === 'string' ? overridePart.label : ''
      if (!overrideLabel) continue

      const matchIndex = mergedParts.findIndex((part) => part.label === overrideLabel)
      if (matchIndex >= 0) {
        mergedParts[matchIndex] = {
          ...mergedParts[matchIndex],
          ...(overridePart as any),
        }
      } else {
        mergedParts.push(overridePart as any)
      }
    }

    menuParts.value = sort(mergedParts, (part) => part.position || 9_999)
  }

  const defaultMenuEntries = getDefaultMenuEntries()

  // Fusion des menus : les entrées YAML peuvent surcharger (override) les entrées par défaut.
  // Override :
  // - priorité au match par `path` (exact)
  // - sinon match par `name` (fourni ou dérivé du `label`)
  // - sinon match par `label` (normalisé, pour compat)
  // - si aucune entrée ne correspond : ajout (placé avant "En erreur" si possible)
  const baseMenuEntries = useDefaultEntries ? defaultMenuEntries : []
  const insertionIndex = baseMenuEntries.findIndex((m) => m.label === 'En erreur')

  const mergedMenuEntries: MenuItem[] = [...baseMenuEntries]
  const unmatchedOverrides: MenuItem[] = []

  for (const overrideEntry of menuEntries as any[]) {
    const overridePath = typeof overrideEntry?.path === 'string' ? overrideEntry.path.trim() : ''
    const overrideLabel = typeof overrideEntry?.label === 'string' ? overrideEntry.label : ''
    const overrideName =
      typeof overrideEntry?.name === 'string'
        ? normalizeNameFromLabel(overrideEntry.name)
        : overrideLabel
          ? normalizeNameFromLabel(overrideLabel)
          : ''

    const matchIndexByPath = overridePath ? mergedMenuEntries.findIndex((m) => m.path === overridePath) : -1
    const matchIndexByName =
      matchIndexByPath === -1 && overrideName
        ? mergedMenuEntries.findIndex((m) => typeof m.name === 'string' && normalizeNameFromLabel(m.name) === overrideName)
        : -1

    const matchIndexByLabel =
      matchIndexByPath === -1 && matchIndexByName === -1 && !overrideName && overrideLabel
        ? mergedMenuEntries.findIndex((m) => normalizeLabel(m.label) === normalizeLabel(overrideLabel))
        : -1

    const matchIndex = matchIndexByPath >= 0 ? matchIndexByPath : matchIndexByName >= 0 ? matchIndexByName : matchIndexByLabel

    if (matchIndex >= 0) {
      const existingEntry = mergedMenuEntries[matchIndex] as any
      const nextEntry: any = {
        ...existingEntry,
        ...(overrideEntry as any),
      }

      // Règle de fusion : `acl` fourni dans menus.yml -> on ajoute, on n'écrase pas.
      if (Array.isArray((overrideEntry as any)?.acl)) {
        const baseAcls = Array.isArray(existingEntry?.acl) ? existingEntry.acl : []
        const overrideAcls = (overrideEntry as any).acl as string[]
        nextEntry.acl = Array.from(new Set([...baseAcls, ...overrideAcls].filter((a) => typeof a === 'string' && a.trim())))
      }

      mergedMenuEntries[matchIndex] = nextEntry
    } else {
      unmatchedOverrides.push(overrideEntry as any)
    }
  }

  if (unmatchedOverrides.length > 0) {
    const indexToInsert = insertionIndex >= 0 ? insertionIndex : mergedMenuEntries.length
    mergedMenuEntries.splice(indexToInsert, 0, ...unmatchedOverrides)
  }

  // `name` est optionnel dans `menus.yml`. On l'auto-remplit sinon.
  for (let i = 0; i < mergedMenuEntries.length; i++) {
    const entry = mergedMenuEntries[i]
    if (typeof (entry as any)?.name === 'string' && (entry as any).name.trim()) continue
    if (typeof entry.label !== 'string' || !entry.label.trim()) continue
    ;(mergedMenuEntries[i] as any).name = normalizeNameFromLabel(entry.label)
  }

  const menus = ref<MenuItem[]>(
    mergedMenuEntries.filter((entry) => {
      const entryRoles = (entry as any)?.roles as unknown
      const requiredRoles = Array.isArray(entryRoles) ? (entryRoles as string[]) : []
      const canSeeByRole = isAdmin || requiredRoles.length === 0 ? true : requiredRoles.some((r) => userRoles.includes(r))
      if (!canSeeByRole) return false

      // Si `acl` est fourni, on laisse `getMenu()` gérer l'autorisation exacte.
      if (getRequiredAcls(entry).length > 0) return true
      if (!entry.path) return false

      const basePath = entry.path.replace(/^\//, '')
      const pathWithoutQuery = basePath.split('?')[0] || ''
      const uri = pathWithoutQuery.split('/')[0] || ''

      return uri ? hasPermissionStartsWith([uri]) : false
    }),
  )

  function normalizeLabel(label: string): string {
    return label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/ /g, '_').replace(/\./g, '')
  }

  function getMenu(): MenuItem[] {
    const menuList: MenuItem[] = menus.value.reduce((acc: MenuItem[], menu) => {
      const stateKey = typeof menu.name === 'string' && menu.name.trim() ? menu.name : normalizeLabel(menu.label)
      const stateValue = identityStateStore.getStateValue(stateKey)
      const value = stateValue > MaxMenuBadgeCount ? MaxMenuBadgeCount + '+' : stateValue?.toString() || '0'

      const requiredAcls = getRequiredAcls(menu as any)
      if (requiredAcls.length > 0) {
        const canSeeByAcl = requiredAcls.some((requiredAcl) =>
          hasPermission(requiredAcl, AccessControlAction.READ, AccessControlPossession.ANY),
        )
        if (!canSeeByAcl) return acc
      }

      acc.push({
        ...menu,
        badge: menu.badge ? <BadgeItem>{
          ...menu?.badge,
          value,
        } : undefined,
      })

      return acc
    }, [])

    return menuList
  }

  function getMenuByPart(part: string): MenuItem[] {
    return getMenu().filter((menu) => menu.part === part)
  }

  async function initialize(): Promise<void> {
    const { encodePath } = useFiltersQuery(ref([]))

    const filters = {}
    for (const menu of menus.value) {
      if (menu.path && menu.badge) {
        const stateKey = typeof menu.name === 'string' && menu.name.trim() ? menu.name : normalizeLabel(menu.label)
        const params = new URL(window.location.origin + encodePath(menu.path)).searchParams
        const queryString = qs.parse(params.toString())
        const qsFilters = {}

        for (const [key, value] of Object.entries(queryString['filters'] || {})) {
          qsFilters[decodeURIComponent(key)] = decodeURIComponent(value as string)
        }

        filters[stateKey] = qsFilters
      }
    }

    await identityStateStore.initialize(filters)
  }

  return { getMenu, menuParts, getMenuByPart, initialize }
}

export { useMenu }
