<template lang="pug">
q-card.flex.column.fit.absolute(flat)
  q-toolbar.bg-transparent.q-pa-none(style='border-radius: 0;')
    q-btn.icon(stretch icon='mdi-arrow-left' flat @click='navigateToTab(`/groups/table`)')
      q-tooltip.text-body2(anchor="top middle" self="center middle") Retour à la liste des groupes
    q-separator(v-for='_ in 2' :key='_' vertical)
    q-toolbar-title
      span(v-if='isNew') Nouveau groupe
      span(v-else v-text='group?.cn || "Groupe sans nom"')
    q-tabs.full-height(:model-value='tab' v-if='!isSmall && !isNew')
      template(v-for="tab in tabs" :key="tab.name")
        q-tab.q-px-none(
          @click='tab.action()'
          v-show='typeof tab?.condition === "function" ? tab.condition() : true'
          :class="[tab.textColor ? `text-${tab.textColor}` : 'text-primary']"
          :name="tab.name"
          :icon="tab.icon"
        )
          q-tooltip.text-body2(
            :delay="200"
            v-text="tab.label" :class="tab.bgColor ? `bg-${tab.bgColor}` : 'bg-primary'"
          )
  q-separator(v-for='_ in 2' :key='_')
  q-card-section.col.q-pa-none.overflow-auto
    nuxt-page(:data='{ group }' ref='page' @refresh-group='refresh')
</template>

<script lang="ts">
import { NewTargetId } from '~/constants/variables'

export default defineNuxtComponent({
  name: 'GroupsTableIdPage',
  async setup() {
    const $route = useRoute()
    const { navigateToTab } = useRouteQueries()
    const { handleError } = useErrorHandling()
    const { hasPermission } = useAccessControl()

    if (NewTargetId === $route.params._id) {
      return {
        navigateToTab,
        hasPermission,
        group: ref({ cn: '', description: '', member: [] as string[] }),
        refresh: async () => {},
      }
    }

    const {
      data: group,
      error,
      refresh,
    } = await useHttp<{ _id: string; cn: string; description?: string; member?: string[]; state?: number }>(`/management/groups/${$route.params._id}`, {
      method: 'get',
      transform: (result: unknown) => {
        const res = result as { data?: { _id: string; cn: string } } | undefined
        if (!res || res.data == null) throw new Error('Invalid API response')
        return res.data
      },
    })
    if (error.value) {
      console.error(error.value)
      navigateToTab(`/groups/table`)
      throw handleError({
        message: 'Erreur lors de la récupération du groupe.',
        error: error.value,
      })
    }

    return {
      navigateToTab,
      hasPermission,
      group,
      refresh,
    }
  },
  computed: {
    isNew(): boolean {
      return this.$route.params._id === NewTargetId
    },
    isSmall(): boolean {
      return this.$q.screen.lt.md
    },
    tab(): string {
      return this.$route.path.split('/')[4] || 'index'
    },
    tabs() {
      const base = `/groups/table/${this.$route.params._id}`
      return [
        {
          name: 'index',
          icon: 'mdi-card-account-details',
          label: 'Fiche groupe',
          bgColor: 'primary',
          textColor: 'primary',
          action: () => this.navigateToTab(base),
          condition: () => this.hasPermission('/management/groups', 'read'),
        },
        {
          name: 'jobs',
          icon: 'mdi-book-clock',
          label: 'Journaux des tâches',
          bgColor: 'info',
          textColor: 'info',
          action: () => this.navigateToTab(`${base}/jobs`),
          condition: () => this.hasPermission('/core/jobs', 'read'),
        },
      ]
    },
  },
})
</script>
