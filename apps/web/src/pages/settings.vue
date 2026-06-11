<template lang="pug">
q-dialog(
  :model-value="true"
  transition-show='none'
  transition-hide='none'
  :full-width="$q.screen.gt.md"
  :full-height="$q.screen.gt.md"
  persistent
  :maximized="!$q.screen.gt.md"
)
  q-card.sesame-sticky-dialog
    q-toolbar.bg-primary.text-white(flat)
      q-btn(flat @click="drawer = !drawer" round dense icon="mdi-menu")
      q-toolbar-title Paramètres
      sesame-core-help-buttons(size='sm')
      q-separator.q-mx-sm(vertical dark inset v-if="debug")
      sesame-core-app-debug-buttons(v-if="debug" size="sm" color="orange-8")
      q-separator.q-mx-sm(vertical dark inset)
      q-btn(icon="mdi-close" flat round dense to='/')
        q-tooltip.text-body2(anchor="top middle" self="bottom middle") Fermer
    .flex.fit(:style='{ flexDirection: $q.screen.gt.sm ? "row" : "column" }')
      .col-0.settings-sidebar(v-if='drawer')
        .settings-main-tabs-wrapper
          q-tabs.border-right.settings-main-tabs(
            v-model="tab"
            :vertical="$q.screen.gt.sm"
            :inline-label="$q.screen.lt.md"
            mobile-arrows
            outside-arrows
          )
            q-tab(
              v-for="item in navItems"
              :key="item.route"
              :name="item.route"
              :label="item.label"
              :icon="item.icon"
              :disable="item._disabled"
            )
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="item._disabled"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour accéder à cette page

            template(v-if="!$q.screen.gt.sm")
              q-separator(v-if="navItems.length > 0 && bottomNavItems.length > 0" inset vertical)
              q-tab(
                v-for="item in bottomNavItems"
                :key="item.route"
                :name="item.route"
                :label="item.label"
                :icon="item.icon"
              )

        .settings-bottom-tabs-wrapper(
          v-if="$q.screen.gt.sm && bottomNavItems.length > 0"
        )
          q-tabs.border-right(
            v-model="tab"
            vertical
          )
            q-tab(
              v-for="item in bottomNavItems"
              :key="item.route"
              :name="item.route"
              :label="item.label"
              :icon="item.icon"
            )
      .col
        q-tab-panels.fit(v-model="tab")
          q-tab-panel.q-pa-none(
            :name="router.currentRoute.value.path"
          )
            nuxt-page
</template>

<script lang="ts">
interface NavItem {
  route: string
  icon: string
  label: string
  _disabled?: boolean
  acl?: string[]
}

export default defineNuxtComponent({
  name: 'SettingsPage',
  setup() {
    const router = useRouter()
    const { hasPermission } = useAccessControl()
    const tab = computed({
      get: () => router.currentRoute.value.path,
      set: (val: string) => {
        // window.location.href = val
        router.push(val)
      },
    })

    const drawer = ref(true)
    const { debug } = useDebug()

    const navItemsInternal = ref<NavItem[]>([
      {
        route: '/settings/agents',
        icon: 'mdi-account',
        label: 'Utilisateurs',
        acl: ['/core/agents'],
      },
      {
        route: '/settings/roles',
        icon: 'mdi-group',
        label: 'Rôles',
        acl: ['/core/roles'],
      },
      {
        route: '/settings/password-policy',
        icon: 'mdi-form-textbox-password',
        label: 'Politique de mot de passe',
        acl: ['/settings/passwdadm'],
      },
      {
        route: '/settings/smtp',
        icon: 'mdi-mail',
        label: 'Serveur SMTP',
        acl: ['/settings/mailadm'],
      },
      {
        route: '/settings/sms',
        icon: 'mdi-message-processing',
        label: 'Serveur SMS',
        acl: ['/settings/smsadm'],
      },
      {
        route: '/settings/cron',
        icon: 'mdi-clipboard-list',
        label: 'Tâches planifiés',
        acl: ['/core/cron'],
      },
      {
        route: '/settings/lifecycle',
        icon: 'mdi-state-machine',
        label: 'Cycles de vie',
        acl: ['/management/lifecycle'],
      },
      {
        route: '/settings/keyrings',
        icon: 'mdi-key-chain',
        label: 'trousseau de clés API',
        acl: ['/core/keyrings'],
      },
    ])

    const bottomNavItemsInternal = ref<NavItem[]>([
      {
        route: '/settings/health',
        icon: 'mdi-heart-pulse',
        label: 'Santé applicative',
        acl: ['/core/health'],
      },
      {
        route: '/settings/configuration',
        icon: 'mdi-tune-variant',
        label: 'Configuration',
        acl: ['/settings/configuration'],
      },
    ])

    const navItems = computed(() => {
      return navItemsInternal.value.map((item) => {
        //console.log(item.acl, !hasPermission(item.acl!, AccessControlAction.READ))
        if (!item.acl || item.acl.length === 0) {
          return item
        }

        const canAccess = item.acl.some((acl) => hasPermission(acl, AccessControlAction.READ))
        return {
          ...item,
          _disabled: !canAccess,
        }
      })
    })

    const bottomNavItems = computed(() => {
      return bottomNavItemsInternal.value.filter((item) => {
        if (!item.acl || item.acl.length === 0) {
          return true
        }

        return item.acl.some((acl) => hasPermission(acl, AccessControlAction.READ))
      })
    })

    return {
      tab,
      drawer,
      debug,
      navItems,
      bottomNavItems,
      router,
      hasPermission,
    }
  },
  methods: {
    toogleDark() {
      this.$q.dark.toggle()
      window.sessionStorage.setItem('darkMode', this.$q.dark.isActive ? 'true' : 'false')
    },
  },
})
</script>

<style scoped>
@media (min-width: 1024px) {
  .settings-sidebar {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .settings-main-tabs-wrapper {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  .settings-bottom-tabs-wrapper {
    flex: 0 0 auto;
  }

  :deep(.settings-main-tabs.q-tabs--vertical) {
    height: 100%;
  }
}
</style>
