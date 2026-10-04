<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Groupes'
      ref='twoPan'
      :simple='false'
      :loading='pending'
      :rows='groups?.data || []'
      :total='groups?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='_id'
    )
      template(#before-top-right-before="{ selected, clearSelection }")
        q-btn(
          :disable='!hasPermission("/management/groups", "create")'
          :to='toPathWithQueries(`/groups/table/${NewTargetId}`)'
          icon='mdi-plus'
          flat
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/groups', 'create')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
        q-separator.q-mx-sm(vertical)
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par nom, description, email...')
      template(v-slot:body-cell-state='props')
        q-td(:props='props')
          q-chip(
            dense
            size='sm'
            :color='getStateBadge(props.row.state).color'
            :text-color='getStateBadge(props.row.state).textColor || "white"'
            :icon='getStateBadge(props.row.state).icon'
            :label='getStateName(props.row.state)'
          )
      template(v-slot:row-actions='{ row }')
        q-btn(:to='toPathWithQueries(`/groups/table/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
        q-btn-dropdown(:class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-horizontal" size='sm' flat round dense)
          q-list(dense)
            q-item(:disable='!hasPermission("/management/groups", "update")' clickable v-close-popup @click="syncGroup(row)")
              q-item-section(avatar)
                q-icon(name="mdi-sync" color="orange-8")
              q-item-section
                q-item-label Synchroniser le groupe
            q-item(:disable='!hasPermission("/management/groups", "delete")' clickable v-close-popup @click="deleteGroup(row)")
              q-item-section(avatar)
                q-icon(name="mdi-delete" color="negative")
              q-item-section
                q-item-label Supprimer le groupe
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/management/groups', 'delete')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      template(#after-content)
        nuxt-page(ref='page' @refresh='refresh')
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { NewTargetId } from '~/constants/variables'

type Group = {
  _id: string
  cn: string
  description?: string
  mail?: string
  member?: string[]
  state: number
  lastBackendSync?: string
}

export default defineNuxtComponent({
  name: 'GroupsTablePage',
  provide() {
    return {
      refresh: this.refresh,
      deleteGroup: this.deleteGroup,
      syncGroup: this.syncGroup,
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination({ name: 'groups' })
    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const { getStateBadge, getStateName } = useIdentityStates()
    const { handleErrorReq } = useErrorHandling()

    const paginationOptions = useHttpPaginationOptions()
    const { hasPermission } = useAccessControl()

    const {
      data: groups,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<{ data: Group[]; total: number }>('/management/groups', {
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
      groups,
      pending,
      refresh,
      toPathWithQueries,
      navigateToTab,
      hasPermission,
      getStateBadge,
      getStateName,
      handleErrorReq,
    }
  },
  data() {
    return {
      NewTargetId,
      visibleColumns: ['cn', 'description', 'mail', 'member', 'state', 'lastBackendSync', 'actions'],
      columns: [
        {
          name: 'cn',
          label: 'Nom (cn)',
          field: (row: Group) => row.cn,
          align: 'left',
          sortable: true,
        },
        {
          name: 'description',
          label: 'Description',
          field: (row: Group) => row.description || '',
          align: 'left',
          sortable: true,
        },
        {
          name: 'mail',
          label: 'Email',
          field: (row: Group) => row.mail || '',
          align: 'left',
          sortable: true,
        },
        {
          name: 'member',
          label: 'Membres',
          field: (row: Group) => (Array.isArray(row.member) ? row.member.length : 0),
          align: 'left',
          sortable: false,
        },
        {
          name: 'state',
          label: 'État',
          field: (row: Group) => row.state,
          align: 'left',
          sortable: true,
        },
        {
          name: 'lastBackendSync',
          label: 'Dernière synchro.',
          field: (row: Group) => (row.lastBackendSync ? this.$dayjs(row.lastBackendSync).format('DD/MM/YYYY HH:mm:ss') : 'Jamais'),
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  computed: {
    targetId(): LocationQueryValue[] | string {
      return `${this.$route.params._id || ''}`
    },
  },
  methods: {
    async syncGroup(group: Group) {
      try {
        await this.$http.post('/management/groups/sync', {
          body: { ids: [group._id] },
        })
        this.$q.notify({
          message: `Le groupe ${group.cn} a été envoyé en synchronisation.`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Impossible de synchroniser le groupe' })
      } finally {
        this.refresh()
      }
    },
    async deleteGroup(group: Group) {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: `Voulez-vous vraiment supprimer le groupe ${group.cn} ?`,
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
            .delete(`/management/groups/${group._id}`)
            .then(() => {
              this.$q.notify({
                message: 'Le groupe a été supprimé.',
                color: 'positive',
                position: 'top-right',
                icon: 'mdi-check-circle-outline',
              })
              this.refresh()
              ;(this.$refs.twoPan as { clearSelection?: () => void } | undefined)?.clearSelection?.()
              if (this.targetId === group._id) {
                this.navigateToTab('/groups/table')
              }
            })
            .catch((error: unknown) => {
              this.handleErrorReq({ error, message: 'Impossible de supprimer le groupe' })
            })
        })
    },
  },
})
</script>
