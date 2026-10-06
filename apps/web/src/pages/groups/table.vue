<template lang="pug">
q-page.grid
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
    selection='multiple'
    row-key='_id'
  )
    template(#before-top-left="{ selected, clearSelection }")
      q-btn-group(rounded flat)
        q-btn(
          flat
          icon="mdi-sync"
          color="orange-8"
          rounded
          size="md"
          dense
          :disable="selected.length === 0 || !hasPermission('/management/groups', 'update')"
          @click="markSelectedToSync(selected, clearSelection)"
        )
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Mettre à synchroniser les groupes sélectionnés
        q-btn(
          flat
          icon="mdi-delete"
          color="negative"
          rounded
          size="md"
          dense
          :disable="selected.length === 0 || !hasPermission('/management/groups', 'delete')"
          @click="deleteSelected(selected, clearSelection)"
        )
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Supprimer les groupes sélectionnés
        q-separator(vertical v-if="selected.length !== 0")
        q-btn(flat icon="mdi-cancel" color="warning" rounded @click="clearSelection" size="md" v-show="selected.length !== 0" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Nettoyer la sélection
      .text-caption.q-ml-sm.text-weight-medium(v-if="selected.length !== 0") {{ selected.length }} groupe(s) sélectionné(s)
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
    template(v-for="col in ellipsisColumns" :key="col" v-slot:[`body-cell-${col}`]='props')
      q-td(:props='props')
        .ellipsis(style='max-width: 220px' :title='props.value') {{ props.value }}
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
import { useIdentityStateStore } from '~/stores/identityState'

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
    const identityStateStore = useIdentityStateStore()

    const {
      data: groups,
      error,
      pending,
      refresh: refreshGroups,
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

    // recharge la liste et les compteurs « à synchroniser », dans lesquels les groupes sont comptés
    const refresh = async () => {
      await Promise.all([refreshGroups(), identityStateStore.fetchAllStateCount()])
    }

    return {
      groups,
      pending,
      refresh,
      refreshGroups,
      identityStateStore,
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
      // colonnes réduites par défaut pour éviter le défilement horizontal du panneau de gauche ;
      // description et dernière synchro restent disponibles via « Afficher/cacher des colonnes »
      visibleColumns: ['cn', 'mail', 'member', 'state'],
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
    ellipsisColumns(): string[] {
      return ['cn', 'description', 'mail']
    },
    groupsRevision(): number {
      return this.identityStateStore.revision
    },
    targetId(): LocationQueryValue[] | string {
      return `${this.$route.params._id || ''}`
    },
  },
  watch: {
    // les états évoluent de façon asynchrone à la fin des jobs (à synchroniser -> synchronisé / en erreur)
    groupsRevision() {
      this.refreshGroups()
    },
  },
  methods: {
    confirmBulk(title: string, message: string, label: string, color: string): Promise<boolean> {
      return new Promise((resolve) => {
        this.$q
          .dialog({
            title,
            message,
            html: true,
            persistent: true,
            ok: { push: true, color, label },
            cancel: { push: true, color: 'grey-8', label: 'Annuler' },
          })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
      })
    },
    selectedNames(selected: Group[]): string {
      const names = selected.slice(0, 10).map((group) => `<li>${this.escapeHtml(group.cn)}</li>`)
      const more = selected.length > 10 ? `<li>… et ${selected.length - 10} autre(s)</li>` : ''
      return `<ul class="q-my-sm">${names.join('')}${more}</ul>`
    },
    escapeHtml(value: string): string {
      return `${value || ''}`.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
    },
    async markSelectedToSync(selected: Group[], clearSelection: () => void) {
      if (!selected.length) return
      const ok = await this.confirmBulk(
        'Mettre à synchroniser',
        `Les ${selected.length} groupe(s) suivant(s) passeront à l'état « À synchroniser » :${this.selectedNames(selected)}`,
        'Valider',
        'orange-8',
      )
      if (!ok) return

      try {
        await this.$http.post('/management/groups/to-sync', {
          body: { ids: selected.map((group) => group._id) },
        })
        this.$q.notify({
          message: `${selected.length} groupe(s) mis à synchroniser.`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        clearSelection()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Impossible de mettre les groupes à synchroniser' })
      } finally {
        await this.refresh()
      }
    },
    async deleteSelected(selected: Group[], clearSelection: () => void) {
      if (!selected.length) return
      const ok = await this.confirmBulk(
        'Supprimer les groupes',
        `Voulez-vous vraiment supprimer les ${selected.length} groupe(s) suivant(s) ?${this.selectedNames(selected)}` +
          'Les groupes déjà synchronisés seront supprimés des backends puis de Sesame.',
        'Supprimer',
        'negative',
      )
      if (!ok) return

      try {
        const res = await this.$http.post('/management/groups/delete', {
          body: { ids: selected.map((group) => group._id) },
        })
        const results = Object.values((res?._data?.data || {}) as Record<string, { error?: string }>)
        const failed = results.filter((result) => result?.error).length
        this.$q.notify({
          message: failed
            ? `${selected.length - failed} groupe(s) supprimé(s) ou en cours de suppression, ${failed} en erreur.`
            : `${selected.length} groupe(s) supprimé(s) ou en cours de suppression.`,
          color: failed ? 'warning' : 'positive',
          position: 'top-right',
          icon: failed ? 'mdi-alert-outline' : 'mdi-check-circle-outline',
        })
        clearSelection()
        if (selected.some((group) => group._id === this.targetId)) {
          this.navigateToTab('/groups/table')
        }
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Impossible de supprimer les groupes' })
      } finally {
        await this.refresh()
      }
    },
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
