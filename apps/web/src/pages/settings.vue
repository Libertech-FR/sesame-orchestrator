<template lang="pug">
q-dialog(:model-value="true" transition-show='none' transition-hide='none' full-width full-height persistent)
  q-card.sesame-sticky-dialog
    q-toolbar.bg-primary(flat)
      q-btn(flat @click="drawer = !drawer" round dense icon="mdi-menu")
      q-toolbar-title Paramètres
      q-btn(icon="mdi-close" flat round dense @click="router.push('/')")
    .flex.fit(:style='{ flexDirection: $q.screen.gt.sm ? "row" : "column" }')
      .col-0
        q-tabs.full-height.border-right(
          v-if='drawer'
          v-model="tab"
          :vertical='$q.screen.gt.sm'
          mobile-arrows
          outside-arrows
        )
          q-tab(
            v-for="item in navItems"
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

<script lang="ts" setup>
import { ref, computed } from 'vue'

const router = useRouter()
const $q = useQuasar()
const tab = computed({
  get: () => router.currentRoute.value.path,
  set: (val: string) => {
    router.replace(val)
  },
})
const drawer = ref($q.screen.gt.sm)
const splitterModel = ref(20)

const navItems = [
  { route: '/settings/agents', icon: 'mdi-account', label: 'Utilisateurs' },
  { route: '/settings/password-policy', icon: 'mdi-form-textbox-password', label: 'Politique de mot de passe' },
  { route: '/settings/smtp', icon: 'mdi-mail', label: 'Serveur SMTP' },
  { route: '/settings/sms', icon: 'mdi-message-processing', label: 'Serveur SMS' },
  { route: '/settings/cron', icon: 'mdi-clipboard-list', label: 'Tâches planifiés' },
]
</script>
<!--
<style scoped>
.q-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  overflow: hidden;
}
.q-card > .q-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
}
.q-card > .flex {
  overflow: auto;
}
.q-card > .q-toolbar.bg-primary {
  background-color: var(--q-color-primary, #1976d2);
}
</style> -->
