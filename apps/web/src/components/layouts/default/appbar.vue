<template lang="pug">
  q-header
    q-toolbar.bg-primary.text-white(style={ height: '32px' })
      q-btn.q-pl-none(flat stretch @click="backToIndex()")
        q-avatar(square)
          q-img(src="/config/logo.png" error-src="/default.png" alt="Sesame logo")
        q-toolbar-title SESAME

      q-space

      q-btn(
        @click="syncAll"
        v-if="badgesValues.TO_SYNC > 0"
        :label="badgesValues.TO_SYNC +' items à Synchroniser'"
        icon="mdi-sync"
        color="amber-9"
        size="md"
        unelevated
        square
      )

      q-separator.q-mx-sm(
        v-if="badgesValues.TO_SYNC > 0"
        vertical
      )

      q-btn(
        @click="$router.push('/settings/agents')"
        icon="mdi-cog"
        size="md"
        stretch
        flat
      )
        q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Paramètres
      q-btn-dropdown(icon="mdi-account-circle-outline" :label="auth?.user?.displayName || auth?.user?.username || 'Utilisateur'" flat stretch size="md")
        q-list
          q-item.q-pa-none(v-for="button in buttons" :key="button.name")
            q-btn.full-width.items-baseline.q-pa-sm(
              :icon="button.icon"
              :label="button.name"
              :color="button?.color || 'primary'"
              @click="button?.action"
              :to='button?.to'
              flat
              dense
            )
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'

export default defineNuxtComponent({
  name: 'LayoutsDefaultAppbarComponent',
  data() {
    return {
      buttons: [
        {
          icon: 'mdi-bug',
          name: 'Debug',
          color: 'warning',
          action: () => {
            const { debug } = useDebug()
            debug.value = !debug.value
          },
        },
        {
          icon: 'mdi-logout',
          name: 'Déconnexion',
          color: 'negative',
          action: async () => {
            await useAuth().logout()
            useRouter().go(0)
          },
        },
      ],
    }
  },
  inject: ['syncing'],
  setup() {
    const stateValue = ref(0)
    const identityStateStore = useIdentityStateStore()
    const badgesValues = ref({
      TO_SYNC: computed(() => (stateValue.value > 9999 ? '9999+' : stateValue.value)),
    })

    watch(
      () => identityStateStore.getStateValue('a_synchroniser'),
      (newValue) => (stateValue.value = newValue),
      { immediate: true },
    )

    const auth = useAuth()

    return {
      auth,
      badgesValues,
      identityStateStore,
    }
  },
  methods: {
    backToIndex() {
      this.$router.push('/')
    },
    async syncAll() {
      this.syncing({ count: this.badgesValues.TO_SYNC })
      this.$http.post('/core/backends/syncall', {
        params: {
          async: true,
        },
      })
      await this.identityStateStore.fetchAllStateCount()
    },
  },
})
</script>
