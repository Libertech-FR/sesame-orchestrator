<template lang="pug">
q-btn(flat icon="mdi-dots-grid" size="20px" square)
  q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Apps
  q-menu(max-height="280px" auto-close fit).q-pa-sm
    .row
      .col-4(v-for="(app, key) in apps" :key="key")
        q-btn(flat stack dense :to="app.to" stretch).full-width.q-pa-sm
          q-icon(:name="app.icon.name" :color="app.icon.color" size="xl")
          q-badge(v-if="app.badge" :color="app.badge.color" floating) {{ app.badge.value }}
          div.text-center(:class="`text-${app.title.color}`") {{ app.title.name }}
</template>

<script lang="ts" setup>
import { usePinia } from '#imports'
const store = usePinia()
const user = store.state.value.auth.user
const apps: {
  title: {
    name: string
    color: string
  }
  icon: {
    name: string
    color: string
  }
  badge?: { color: string; value: number | undefined }
  to: string
}[] = [
    {
      title: {
        name: 'Accueil',
        color: 'primary',
      },
      icon: {
        name: 'mdi-home',
        color: 'secondary',
      },
      to: '/',
    },
    {
      title: {
        name: 'Agents',
        color: 'primary',
      },
      icon: {
        name: 'mdi-account',
        color: 'secondary',
      },
      to: '/agents',
    },
    {
      title: {
        name: 'Comptes',
        color: 'secondary',
      },
      icon: {
        name: 'mdi-account-group',
        color: 'primary',
      },
      to: `/identities`,
    },
  ]
</script>
