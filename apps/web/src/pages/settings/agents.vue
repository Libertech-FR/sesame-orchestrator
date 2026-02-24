<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Agents'
      ref='twoPan'
      :simple='false'
      :loading='pending'
      :rows='agents?.data || []'
      :total='agents?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='_id'
    )
      template(#before-top-right-before="{ selected, clearSelection }")
        q-btn(
          :to='toPathWithQueries(`/settings/agents/${NewTargetId}`)'
          icon='mdi-plus'
          flat
          dense
        )
        q-separator.q-mx-sm(vertical)
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par username, email, ...')
      template(v-slot:row-actions='{ row }')
        q-btn(:to='toPathWithQueries(`/settings/agents/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
        q-btn-dropdown(:class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-horizontal" size='sm' flat round dense)
          q-list(dense)
            q-item(clickable v-close-popup @click="deleteAgent(row)")
              q-item-section(avatar)
                q-icon(name="mdi-delete" color="negative")
              q-item-section
                q-item-label Supprimer l'agent
      template(#after-content)
        nuxt-page(ref='page' @refresh='refresh')
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import type { components, operations } from '#build/types/service-api'
import { NewTargetId } from '~/constants/variables'

type Agent = components['schemas']['AgentsDto']
type Response = operations['AgentsController_search']['responses']['200']['content']['application/json']

export default defineNuxtComponent({
  name: 'SettingsAgentsPage',
  data() {
    return {
      NewTargetId,
      visibleColumns: ['username', 'email', 'actions'],
      columns: [
        {
          name: 'username',
          label: "Nom d'utilisateur",
          field: (row: Agent) => row.username,
          align: 'left',
          sortable: true,
        },
        {
          name: 'email',
          label: 'Email',
          field: (row: Agent) => row.email,
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  provide() {
    return {
      refresh: this.refresh,
      deleteAgent: this.deleteAgent,
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()
    const { toPathWithQueries, navigateToTab } = useRouteQueries()

    const paginationOptions = useHttpPaginationOptions()

    const {
      data: agents,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<Response>('/core/agents', {
      method: 'get',
      ...paginationOptions,
    })
    if (error.value) {
      console.error(error.value)
      throw showError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      })
    }

    useHttpPaginationReactive(paginationOptions, execute)

    return {
      agents,
      pending,
      refresh,
      toPathWithQueries,
      navigateToTab,
    }
  },
  computed: {
    targetId(): LocationQueryValue[] | string {
      return `${this.$route.params._id || ''}`
    },
    search: {
      get(): LocationQueryValue[] | string {
        const v = this.$route.query['search'] || ''

        return `${v}`.replace(/^\*|\*$/g, '')
      },
      set(v: string): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            search: v ? `${v}` : undefined,
          },
        })
      },
    },
  },
  methods: {
    async deleteAgent(agent: Record<string, any>) {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez-vous vraiment supprimer cet agent ?',
          persistent: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Supprimer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(() => {
          this.$http
            .delete(`/core/agents/${agent._id}`)
            .then(() => {
              this.$q.notify({
                message: "L'agent a été supprimé.",
                color: 'positive',
                position: 'top-right',
                icon: 'mdi-check-circle-outline',
              })
              this.refresh()
              ;(this.$refs.twoPan as any).clearSelection()
              if (this.targetId === agent._id) {
                this.navigateToTab('/settings/agents')
              }
            })
            .catch((error: any) => {
              this.$q.notify({
                message: "Impossible de supprimer l'agent : " + error.response._data.message,
                color: 'negative',
                position: 'top-right',
                icon: 'mdi-alert-circle-outline',
              })
            })
        })
    },
  },
})
</script>
