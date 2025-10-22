import { IdentityState, useIdentityStates } from "./useIdentityStates"
import qs from 'qs'

const { getStateBadge } = useIdentityStates()
const config = useAppConfig()

type Badge = {
  color: string
  name?: string
  value?: string
}

type Menu = {
  icon: string
  label: string
  path: string
  color: string
  part: string
  badge?: Badge
  hideInMenuBar?: boolean
}

function useMenu(identityStateStore) {
  const menuParts = ref(['Données', 'Listes', 'Affectations', 'Etats', 'Activation'])
  const menus = ref<Menu[]>([
    {
      icon: 'mdi-account',
      label: 'Liste des identités',
      path: '/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters',
      color: 'primary',
      badge: { color: 'primary' },
      part: 'Données',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-download-outline',
      label: 'Exporter',
      path: '/identities/export',
      color: 'primary',
      part: 'Données',
      hideInMenuBar: true
    }, {
      icon: 'mdi-book-clock',
      label: 'Journal des jobs',
      path: '/jobs/table?filters[:state]=-1',
      color: 'primary',
      part: 'Données',
      hideInMenuBar: false
    }, {
      icon: 'mdi-timeline-clock-outline',
      label: 'Journal des jobs',
      path: '/lifecycles/table',
      color: 'primary',
      part: 'Données',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-set-merge',
      label: 'Detection des doublons',
      path: '/identities/fusion',
      color: 'green',
      part: 'Données',
      hideInMenuBar: true
    },
    {
      icon: 'mdi-trash-can',
      label: 'Corbeille',
      path: '/identities/trash',
      color: 'black',
      hideInMenuBar: true,
      part: 'Données'
    },
    {
      icon: 'mdi-account-check',
      label: 'A valider',
      path: `/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_VALIDATE}`,
      color: 'primary',
      badge: getStateBadge(IdentityState.TO_VALIDATE),
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-account-alert',
      label: 'A compléter',
      path: `/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_COMPLETE}`,
      color: 'primary',
      badge: getStateBadge(IdentityState.TO_COMPLETE),
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-sync',
      label: 'A synchroniser',
      path: `/identities/readonly?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.TO_SYNC}`,
      color: 'primary',
      badge: getStateBadge(IdentityState.TO_SYNC),
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-loading',
      label: 'En cours de synchro.',
      path: `/identities/readonly?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.PROCESSING}`,
      color: 'primary',
      badge: getStateBadge(IdentityState.PROCESSING),
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-check',
      label: 'Synchronisées',
      path: `/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.SYNCED}`,
      badge: getStateBadge(IdentityState.SYNCED),
      color: 'primary',
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-account-switch-outline',
      label: 'Fusionnées',
      path: '/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[!:primaryEmployeeNumber]=null',
      color: 'primary',
      part: 'Etats',
      hideInMenuBar: false
    },
    ...config?.menus?.entries || [],
    {
      icon: 'mdi-account-remove',
      label: 'En erreur',
      path: `/identities?sort[metadata.lastUpdatedAt]=desc&skip=0&filters[@state][]=${IdentityState.ON_ERROR}`,
      color: 'primary',
      badge: getStateBadge(IdentityState.ON_ERROR),
      part: 'Etats',
      hideInMenuBar: false
    },
    {
      icon: 'mdi-email-alert',
      label: 'Invitations non envoyés',
      path: '/identities?limit=10&skip=0&filters[&filters[%23initState]=0&sort[metadata.lastUpdatedAt]=desc',
      color: 'negative',
      part: 'Activation',
      badge: { color: 'grey' },
      hideInMenuBar: false
    },
    {
      icon: 'mdi-email-fast',
      label: 'Invitations envoyées',
      path: '/identities?limit=10&skip=0&filters[&filters[%23initState]=1&sort[metadata.lastUpdatedAt]=desc',
      color: 'warning',
      part: 'Activation',
      badge: { color: 'grey' },
      hideInMenuBar: false
    },
    {
      icon: 'mdi-email-open',
      label: 'Comptes activés',
      path: '/identities?limit=10&skip=0&filters[&filters[%23initState]=2&sort[metadata.lastUpdatedAt]=desc',
      color: 'positive',
      part: 'Activation',
      badge: { color: 'grey' },
      hideInMenuBar: false
    },
    {
      icon: 'mdi-email-remove',
      label: 'Invitations périmées',
      path: '/identities/outdated',
      color: 'accent',
      part: 'Activation',
      hideInMenuBar: false
    },
  ])

  function normalizeLabel(label: string): string {
    return label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, '').replace(/ /g, '_').replace(/\./g, '')
  }

  function getMenu(): Menu[] {
    const menuList: Menu[] = menus.value.reduce((acc: Menu[], menu) => {
      const label = normalizeLabel(menu.label)
      const stateValue = identityStateStore.getStateValue(label)
      const value = stateValue > 9999 ? '9999+' : stateValue?.toString() || '0'

      // console.log('stateValue', label, stateValue, value)

      // const badgeType = menu.badgeValue ? menu.badgeValue : 'UNKNOWN'
      // const stateInfo = getStateInfos(IdentityState[badgeType])
      // const badge: Badge = {

      //   // name: label,
      //   // name: stateInfo.name,
      //   // color: 'red',
      //   // color: stateInfo.color === 'grey' ? 'primary' : stateInfo.color,
      //   value,
      // }
      acc.push({
        ...menu,
        badge: menu.badge ? <Badge>{
          ...menu?.badge,
          value,
        } : undefined,
      })
      return acc
    }, [])
    return menuList
  }

  function getMenuByPart(part: string): Menu[] {
    return getMenu().filter((menu) => menu.part === part)
  }

  async function initialize() {
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
