import type { BadgeItem, MenuItem } from '~/constants/types'
import { useIdentityStates } from './useIdentityStates'
import { DefaultMenuParts, MaxMenuBadgeCount, MenuPart } from '~/constants/variables'
import { IdentityState } from '~/constants/enums'
import qs from 'qs'

const { getStateBadge } = useIdentityStates()
const config = useAppConfig()

type useMenuReturnType = {
  getMenu: () => MenuItem[]
  menuParts: Ref<string[]>
  getMenuByPart: (part: string) => MenuItem[]
  initialize: () => Promise<void>
}

function useMenu(identityStateStore): useMenuReturnType {
  const menuParts = ref(DefaultMenuParts)
  const menus = ref<MenuItem[]>([
    {
      icon: 'mdi-account',
      label: 'Liste des identités',
      path: '/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters',
      color: 'primary',
      badge: { color: 'primary' },
      part: MenuPart.DONNEES,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-download-outline',
      label: 'Exporter',
      path: '/identities/export',
      color: 'accent',
      part: MenuPart.DONNEES,
      hideInMenuBar: true
    }, {
      icon: 'mdi-book-clock',
      label: 'Journal des jobs',
      path: '/jobs/table?filters[:state]=-1',
      color: 'info',
      part: MenuPart.DONNEES,
      hideInMenuBar: false
    }, {
      icon: 'mdi-timeline-clock-outline',
      label: 'Cycle de vie des identités',
      path: '/lifecycles/table',
      color: 'info',
      part: MenuPart.DONNEES,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-set-merge',
      label: 'Detection des doublons',
      path: '/identities/fusion',
      color: 'positive',
      part: MenuPart.DONNEES,
      hideInMenuBar: true,
    },
    {
      icon: 'mdi-trash-can',
      label: 'Corbeille',
      path: '/identities/trash',
      color: 'grey-10',
      hideInMenuBar: true,
      part: MenuPart.DONNEES,
    },
    {
      icon: 'mdi-account-check',
      label: 'A valider',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_VALIDATE}`,
      color: 'warning',
      textColor: 'black',
      badge: getStateBadge(IdentityState.TO_VALIDATE),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-account-alert',
      label: 'A compléter',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_COMPLETE}`,
      color: 'secondary',
      textColor: 'black',
      badge: getStateBadge(IdentityState.TO_COMPLETE),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-sync',
      label: 'A synchroniser',
      path: `/identities/table?readonly=1&sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_SYNC}`,
      color: 'orange-8',
      badge: getStateBadge(IdentityState.TO_SYNC),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-loading',
      label: 'En cours de synchro.',
      path: `/identities/table?readonly=1&sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.PROCESSING}`,
      color: 'grey-8',
      badge: getStateBadge(IdentityState.PROCESSING),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-check',
      label: 'Synchronisées',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.SYNCED}`,
      badge: getStateBadge(IdentityState.SYNCED),
      color: 'positive',
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-account-switch-outline',
      label: 'Fusionnées',
      path: '/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[!:primaryEmployeeNumber]=null',
      color: 'grey-3',
      textColor: 'black',
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    ...config?.menus?.entries || [],
    {
      icon: 'mdi-account-remove',
      label: 'En erreur',
      path: `/identities/table?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.ON_ERROR}`,
      color: 'negative',
      badge: getStateBadge(IdentityState.ON_ERROR),
      part: MenuPart.ETATS,
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-email-alert',
      label: 'Invitations non envoyées',
      path: '/identities/table?limit=10&skip=0&filters[&filters[%23initState]=0&sort[metadata.lastUpdatedAt]=desc',
      color: 'negative',
      part: MenuPart.ACTIVATION,
      badge: { color: 'negative' },
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-email-fast',
      label: 'Invitations envoyées',
      path: '/identities/table?limit=10&skip=0&filters[&filters[%23initState]=1&sort[metadata.lastUpdatedAt]=desc',
      color: 'warning',
      textColor: 'black',
      part: MenuPart.ACTIVATION,
      badge: { color: 'warning', textColor: 'black' },
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-email-open',
      label: 'Comptes activés',
      path: '/identities/table?limit=10&skip=0&filters[&filters[%23initState]=2&sort[metadata.lastUpdatedAt]=desc',
      color: 'positive',
      textColor: 'white',
      part: MenuPart.ACTIVATION,
      badge: { color: 'positive' },
      hideInMenuBar: false,
    },
    {
      icon: 'mdi-email-remove',
      label: 'Invitations périmées',
      path: '/identities/outdated',
      color: 'accent',
      part: MenuPart.ACTIVATION,
      hideInMenuBar: false,
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
    const filters = {}
    for (const menu of menus.value) {
      if (menu.path && menu.badge) {
        const label = normalizeLabel(menu.label)
        const params = new URL(window.location.origin + menu.path).searchParams
        const queryString = qs.parse(params.toString())

        filters[label] = queryString['filters']
      }
    }

    await identityStateStore.initialize(filters)
  }

  return { getMenu, menuParts, getMenuByPart, initialize }
}

export { useMenu }
