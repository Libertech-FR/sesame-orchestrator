import type { BadgeItem, MenuItem } from '~/constants/types'
import { useIdentityStates } from './useIdentityStates'
import { DefaultMenuParts, MaxMenuBadgeCount, MenuPart } from '~/constants/variables'
import { IdentityState } from '~/constants/enums'
import qs from 'qs'
import type { useIdentityStateStore } from '~/stores/identityState'
import { sort } from 'radash'

const { getStateBadge } = useIdentityStates()
const config = useAppConfig()

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
  const menuEntries = (config?.menus?.entries as any[]) || []
  const { hasPermission, hasPermissionStartsWith } = useAccessControl()

  if (config?.menus?.parts) {
    menuParts.value = sort([...menuParts.value, ...(config.menus?.parts as any) || []], (part) => {
      const pos = part.position || 9_999
      return pos
    })
  }

  const menus = ref<MenuItem[]>([
    {
      icon: 'mdi-account',
      label: 'Liste des identités',
      path: '/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0',
      color: 'primary',
      badge: { color: 'primary' },
      part: MenuPart.DONNEES,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-download-outline',
      label: 'Exporter',
      path: '/identities/export',
      color: 'accent',
      part: MenuPart.DONNEES,
      hideInMenuBar: true,
      _acl: '/management/identities',
    }, {
      icon: 'mdi-book-clock',
      label: 'Journal des jobs',
      path: '/jobs/table?filters[:state]=-1',
      color: 'info',
      part: MenuPart.DONNEES,
      hideInMenuBar: false,
      _acl: '/core/jobs',
    }, {
      icon: 'mdi-timeline-clock-outline',
      label: 'Cycle de vie des identités',
      path: '/lifecycles/table',
      color: 'info',
      part: MenuPart.DONNEES,
      hideInMenuBar: false,
      _acl: '/management/lifecycle',
    },
    {
      icon: 'mdi-clipboard-text-clock',
      label: 'Historique des changements',
      path: '/audits/table',
      color: 'lime-8',
      hideInMenuBar: false,
      part: MenuPart.DONNEES,
      _acl: '/core/audits',
    },
    {
      icon: 'mdi-set-merge',
      label: 'Detection des doublons',
      path: '/identities/fusion',
      color: 'positive',
      part: MenuPart.DONNEES,
      hideInMenuBar: true,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-trash-can',
      label: 'Corbeille',
      path: '/identities/trash',
      color: 'grey-10',
      hideInMenuBar: true,
      part: MenuPart.DONNEES,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-account-check',
      label: 'A valider',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[#state]=${IdentityState.TO_VALIDATE}`,
      color: 'warning',
      textColor: 'black',
      badge: getStateBadge(IdentityState.TO_VALIDATE),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-account-alert',
      label: 'A compléter',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[%23state]=${IdentityState.TO_COMPLETE}`,
      color: 'secondary',
      textColor: 'black',
      badge: getStateBadge(IdentityState.TO_COMPLETE),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-sync',
      label: 'A synchroniser',
      path: `/identities/table?readonly=1&sort[metadata.lastUpdatedAt]=desc&skip=0&filters[%23state]=${IdentityState.TO_SYNC}`,
      color: 'orange-8',
      badge: getStateBadge(IdentityState.TO_SYNC),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-loading',
      label: 'En cours de synchro.',
      path: `/identities/table?readonly=1&sort[metadata.lastUpdatedAt]=desc&skip=0&filters[%23state]=${IdentityState.PROCESSING}`,
      color: 'grey-8',
      badge: getStateBadge(IdentityState.PROCESSING),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-check',
      label: 'Synchronisées',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[%23state]=${IdentityState.SYNCED}`,
      badge: getStateBadge(IdentityState.SYNCED),
      color: 'positive',
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-account-switch-outline',
      label: 'Fusionnées',
      path: '/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[~primaryEmployeeNumber]=true',
      color: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F97316 100%)',
      textColor: 'white',
      badge: { color: 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F97316 100%)', textColor: 'white' },
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    ...menuEntries
      .filter((entry: any) => {
        if (entry._acl) {
          return hasPermissionStartsWith([entry._acl])
        }

        const basePath = entry.path.replace(/^\//, '')
        const path = basePath.split('?')[0] || ''
        const uri = path[0].split('/')[0] || ''

        return hasPermissionStartsWith([uri])
      }) || [],
    {
      icon: 'mdi-account-remove',
      label: 'En erreur',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[%23state]=${IdentityState.ON_ERROR}`,
      color: 'negative',
      badge: getStateBadge(IdentityState.ON_ERROR),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-email-alert',
      label: 'Invitations non envoyées',
      path: '/identities/table?limit=10&skip=0&filters[%23initState]=0&sort[metadata.lastUpdatedAt]=desc',
      color: 'negative',
      part: MenuPart.ACTIVATION,
      badge: { color: 'negative' },
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-email-fast',
      label: 'Invitations envoyées',
      path: '/identities/table?limit=10&skip=0&filters[%23initState]=1&sort[metadata.lastUpdatedAt]=desc',
      color: 'warning',
      textColor: 'black',
      part: MenuPart.ACTIVATION,
      badge: { color: 'warning', textColor: 'black' },
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-email-open',
      label: 'Comptes activés',
      path: '/identities/table?limit=10&skip=0&filters[%23initState]=2&sort[metadata.lastUpdatedAt]=desc',
      color: 'positive',
      textColor: 'white',
      part: MenuPart.ACTIVATION,
      badge: { color: 'positive' },
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
    {
      icon: 'mdi-email-remove',
      label: 'Invitations périmées',
      path: '/identities/outdated',
      color: 'accent',
      part: MenuPart.ACTIVATION,
      hideInMenuBar: false,
      _acl: '/management/identities',
    },
  ])

  function normalizeLabel(label: string): string {
    return label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/ /g, '_').replace(/\./g, '')
  }

  function getMenu(): MenuItem[] {
    const menuList: MenuItem[] = menus.value.reduce((acc: MenuItem[], menu) => {
      const label = normalizeLabel(menu.label)
      const stateValue = identityStateStore.getStateValue(label)
      const value = stateValue > MaxMenuBadgeCount ? MaxMenuBadgeCount + '+' : stateValue?.toString() || '0'

      if (menu._acl && !hasPermission(menu._acl, AccessControlAction.READ, AccessControlPossession.ANY)) {
        return acc
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
        const label = normalizeLabel(menu.label)
        const params = new URL(window.location.origin + encodePath(menu.path)).searchParams
        const queryString = qs.parse(params.toString())
        const qsFilters = {}

        for (const [key, value] of Object.entries(queryString['filters'] || {})) {
          qsFilters[decodeURIComponent(key)] = decodeURIComponent(value as string)
        }

        filters[label] = qsFilters
      }
    }

    await identityStateStore.initialize(filters)
  }

  return { getMenu, menuParts, getMenuByPart, initialize }
}

export { useMenu }
