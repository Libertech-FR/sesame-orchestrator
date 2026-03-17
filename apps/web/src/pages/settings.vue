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
      q-separator.q-mx-sm(vertical dark inset)
      q-btn(icon="mdi-close" flat round dense to='/')
        q-tooltip.text-body2(anchor="top middle" self="bottom middle") Fermer
    .flex.fit(:style='{ flexDirection: $q.screen.gt.sm ? "row" : "column" }')
      .col-0
        q-tabs.full-height.border-right(
          v-if='drawer'
          v-model="tab"
          :vertical='$q.screen.gt.sm'
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
  _acl?: string
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

    const navItemsInternal = ref<NavItem[]>([
      {
        route: '/settings/agents',
        icon: 'mdi-account',
        label: 'Utilisateurs',
        _acl: '/core/agents',
      },
      {
        route: '/settings/roles',
        icon: 'mdi-group',
        label: 'Rôles',
        _acl: '/core/roles',
      },
      {
        route: '/settings/password-policy',
        icon: 'mdi-form-textbox-password',
        label: 'Politique de mot de passe',
        _acl: '/settings/passwdadm',
      },
      {
        route: '/settings/smtp',
        icon: 'mdi-mail',
        label: 'Serveur SMTP',
        _acl: '/settings/mailadm',
      },
      {
        route: '/settings/sms',
        icon: 'mdi-message-processing',
        label: 'Serveur SMS',
        _acl: '/settings/smsadm',
      },
      {
        route: '/settings/cron',
        icon: 'mdi-clipboard-list',
        label: 'Tâches planifiés',
        _acl: '/core/cron',
      },
      {
        route: '/settings/keyrings',
        icon: 'mdi-key-chain',
        label: 'trousseau de clés API',
        _acl: '/core/keyrings',
      },
      {
        route: '/settings/health',
        icon: 'mdi-heart-pulse',
        label: 'Santé applicative',
      },
    ])

    const navItems = computed(() => {
      return navItemsInternal.value.map((item) => {
        //console.log(item._acl, !hasPermission(item._acl!, AccessControlAction.READ))
        if (!item._acl) {
          return item
        }

        return {
          ...item,
          _disabled: !hasPermission(item._acl!, AccessControlAction.READ),
        }
      })
    })

    return {
      tab,
      drawer,
      navItems,
      router,
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
