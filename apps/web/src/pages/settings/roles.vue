<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Rôles'
      ref='twoPan'
      :simple='false'
      :loading='pending'
      :rows='roles?.data || []'
      :total='roles?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='_id'
    )
      template(#before-top-right-before="{ selected, clearSelection }")
        q-btn(
          :disable='!hasPermission("/core/roles", "create")'
          :to='toPathWithQueries(`/settings/roles/${NewTargetId}`)'
          icon='mdi-plus'
          flat
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/core/roles', 'create')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
        q-separator.q-mx-sm(vertical)
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par username, email, ...')
      template(v-slot:row-actions='{ row }')
        q-btn(:to='toPathWithQueries(`/settings/roles/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
        q-btn-dropdown(:class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-horizontal" size='sm' flat round dense)
          q-list(dense)
            q-item(:disable='!hasPermission("/core/roles", "delete")' clickable v-close-popup @click="deleteRole(row)")
              q-item-section(avatar)
                q-icon(name="mdi-delete" color="negative")
              q-item-section
                q-item-label Supprimer le rôle
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/core/roles', 'delete')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      template(#after-content)
        nuxt-page(ref='page' @refresh='refresh')
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import type { components, operations } from '#build/types/service-api'
import { NewTargetId } from '~/constants/variables'

type Role = components['schemas']['RolesDto']
type Response = operations['RolesController_search']['responses']['200']['content']['application/json']

export default defineNuxtComponent({
  name: 'SettingsRolesPage',
  data() {
    return {
      NewTargetId,
      visibleColumns: ['name', 'displayName', 'actions'],
      columns: [
        {
          name: 'name',
          label: "Nom",
          field: (row: Role) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'displayName',
          label: 'Nom',
          field: (row: Role) => row.displayName,
          align: 'left',
          sortable: true,
        }
      ],
    }
  },
  provide() {
    return {
      refresh: this.refresh,
      deleteRole: this.deleteRole,
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()
    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const { hasPermission } = useAccessControl()

    const paginationOptions = useHttpPaginationOptions()

    const {
      data: roles,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<Response>('/core/roles', {
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
      roles,
      pending,
      refresh,
      toPathWithQueries,
      navigateToTab,
      hasPermission,
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
    async deleteRole(role: Record<string, any>) {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez-vous vraiment supprimer ce rôle ?',
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
            .delete(`/core/roles/${role._id}`)
            .then(() => {
              this.$q.notify({
                message: "Le rôle a été supprimé.",
                color: 'positive',
                position: 'top-right',
                icon: 'mdi-check-circle-outline',
              })
              this.refresh()
              ;(this.$refs.twoPan as any).clearSelection()
              if (this.targetId === role._id) {
                this.navigateToTab('/settings/roles')
              }
            })
            .catch((error: any) => {
              this.$q.notify({
                message: "Impossible de supprimer le rôle : " + error.response._data.message,
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
