<template lang="pug">
q-card.flex.column.fit.absolute(flat)
  q-toolbar.bg-transparent.q-pa-none(style='border-radius: 0;')
    q-btn.icon(stretch icon='mdi-arrow-left' flat @click='navigateToTab(`/settings/agents`)')
      q-tooltip.text-body2(anchor="top middle" self="center middle") Retour à la liste des agents
    q-separator(v-for='_ in 2' :key='_' vertical)
    q-toolbar-title.cursor-pointer(@click='navigateToTab(`/settings/agents/${agent._id}`)')
      span(v-if='isNew') Nouvel agent
      span(v-else v-text='agent?.username || "Agent sans nom"')
    q-tabs.full-height(:model-value='tab' v-if='!isSmall && !isNew')
      q-tab.q-px-none(
        v-for="tab in tabs" :key="tab.name"
        @click='tab?.action(agent)'
        v-show='typeof tab?.condition === "function" ? tab.condition() : true'
        :class="[tab.textColor ? `text-${tab.textColor}` : 'text-primary']"
        :name="tab.name"
        :icon="tab.icon"
      )
  q-separator(v-for='_ in 2' :key='_')
  q-card-section.col.q-pa-none.overflow-auto
    nuxt-page(:data='{ agent }' ref='page')
</template>

<script lang="ts">
import type { components, operations } from '#build/types/service-api'
import type { _Transform } from 'nuxt/dist/app/composables/asyncData'
import { NewTargetId } from '~/constants/variables'

type Agent = components['schemas']['AgentsDto']
type Response = operations['AgentsController_read']['responses']['200']['content']['application/json']

export default defineNuxtComponent({
  name: 'SettingsAgentsIdPage',
  async setup() {
    const $route = useRoute()
    const { debug } = useDebug()
    const { navigateToTab } = useRouteQueries()
    const { handleError } = useErrorHandling()

    if (NewTargetId === $route.params._id) {
      return {
        navigateToTab,
        agent: {} as Agent,
        debug,
      }
    }

    const {
      data: agent,
      error,
      refresh,
    } = await useHttp<Agent>(`/core/agents/` + $route.params._id, {
      method: 'get',
      transform: (result: unknown) => {
        const res = result as Response | undefined
        if (!res || res.data == null) throw new Error('Invalid API response')
        return res.data as Agent
      },
    })
    if (error.value) {
      console.error(error.value)
      navigateToTab(`/settings/agents`)
      throw handleError({
        message: "Erreur lors de la récupération de l'agent.",
        error: error.value,
      })
    }

    return {
      navigateToTab,
      agent,
      debug,
    }
  },
  computed: {
    isNew(): boolean {
      return this.$route.params._id === NewTargetId
    },
    isSmall(): boolean {
      return this.$q.screen.lt.md
    },
    tab: {
      get(): string {
        return this.$route.path.split('/')[4] || 'index'
      },
      set(value: string) {
        this.navigateToTab(`/settings/agents/${this.isNew ? NewTargetId : this.agent!._id}/${value === 'index' ? '' : value}`)
      },
    },
    tabs() {
      return [
        {
          name: 'index',
          icon: 'mdi-card-account-details',
          label: 'Fiche agent',
          action: (i) => this.navigateToTab(`/settings/agents/${this.isNew ? NewTargetId : i._id}`),
        },
        {
          name: 'debug',
          icon: 'mdi-bug',
          label: 'Debug',
          bgColor: 'orange',
          textColor: 'orange',
          action: (i) => this.navigateToTab(`/settings/agents/${this.isNew ? NewTargetId : i._id}/debug`),
          condition: () => this.debug,
        },
      ]
    },
  },
})
</script>
