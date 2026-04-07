<template lang="pug">
q-page.grid
  sesame-core-twopan.col(
    ref='twoPan'
    table-title='Gestion des identités'
    :simple='false'
    :loading='pending'
    :rows='identities?.data || []'
    :total='identities?.total || 0'
    :columns='columns'
    :visible-columns='visibleColumns'
    :refresh='refresh'
    :execute='execute'
    :targetId='targetId'
    selection='multiple'
    row-key='_id'
  )
    template(#top-table)
      sesame-core-pan-filters(:columns='columns' :columnsType='columnsType' mode='complex' :placeholder='"Rechercher par nom, prénom, email, ..."')
    template(#before-top-right-before="{ selected, clearSelection }")
      q-btn.q-ml-md(
        :disable='!hasPermission("/management/identities", "create")'
        :to='toPathWithQueries(`/identities/table/${NewTargetId}`, {}, "schema=inetOrgPerson")'
        icon='mdi-plus'
        flat
        dense
      )
        q-tooltip.text-body2.bg-negative.text-white(
          v-if="!hasPermission('/management/identities', 'create')"
          anchor="top middle"
          self="center middle"
        ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      q-separator.q-mx-sm(vertical)
    template(#before-top-left="{ selected, clearSelection }")
      q-btn-group(rounded flat)
        q-btn(flat icon="mdi-sync" color="orange-8" rounded @click="openUpdateModal(selected)" size="md" :disable="selected.length === 0" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Mettre à synchroniser les identités sélectionnées
        q-btn(flat icon="mdi-email-arrow-right" color="primary" rounded @click="openInitModal(selected)" size="md" :disable="selected.length === 0 || !areAllSelectedSynced(selected)" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale")
            span(v-if="areAllSelectedSynced(selected)") Envoyer le mail d'invitation
            span(v-else) Action disponible uniquement pour des identités synchronisées
        q-btn(flat icon="mdi-email" color="teal-7" rounded @click="openMailTemplateModal(selected)" size="md" :disable="selected.length === 0 || !areAllSelectedSynced(selected)" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale")
            span(v-if="areAllSelectedSynced(selected)") Envoyer un mail (template)
            span(v-else) Action disponible uniquement pour des identités synchronisées
        q-btn(flat icon="mdi-delete" color="negative" rounded @click="openTrashModal(selected)" size="md" :disable="selected.length === 0" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Supprimer en masse
        q-separator(vertical v-if="selected.length !== 0")
        q-btn(flat icon="mdi-cancel" color="warning" rounded @click="clearSelection" size="md" v-show="selected.length !== 0" dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Nettoyer la selection
    template(#body-cell-state="props")
      q-td
        sesame-pages-identities-states-info(:identity='props.row')
    template(v-slot:row-actions='{ row }')
      q-btn(:to='toPathWithQueries(`/identities/table/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
      q-btn-dropdown(:class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-horizontal" size='sm' flat round dense)
        q-list(dense)
          template(v-for="tab in tabs" :key="tab.name")
            q-separator(v-if="tab.type === 'separator'")
            q-item(
              v-else-if="tab.type !== 'separator'"
              v-show='typeof tab?.condition === "function" ? tab.condition() : true'
              @click='tab?.action(row)'
              clickable v-close-popup
            )
              q-item-section(avatar)
                q-icon(:name="tab.icon" :class="tab.textColor ? `text-${tab.textColor}` : 'text-primary'")
              q-item-section
                q-item-label(v-text="tab.label")
          q-separator
          q-item(clickable v-close-popup @click="deleteIdentity(row)" :disable='!hasPermission("/management/identities", "delete")')
            q-tooltip.text-body2.bg-negative.text-white(
              v-if="!hasPermission('/management/identities', 'delete')"
              anchor="top middle"
              self="center middle"
            ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
            q-item-section(avatar)
              q-icon(name="mdi-delete" color="negative")
            q-item-section
              q-item-label Supprimer l'identité
    template(#after-content)
      nuxt-page(ref='page' @refresh='refresh')
</template>

<script lang="ts">
import { IdentityState } from '~/constants/enums'
import Page from './table/[_id].vue'
import type { LocationQueryValue } from 'vue-router'
import updateInitModal from '~/components/pages/identities/modals/update-init.vue'
import mailTemplateModal from '~/components/pages/identities/modals/mail-template.vue'
import updateIdentityModal from '~/components/pages/identities/modals/update-identity.vue'
import deleteManyModal from '~/components/pages/identities/modals/delete-many.vue'
import { useIdentityStateStore } from '~/stores/identityState'
import { NewTargetId } from '~/constants/variables'

type TabItem = {
  name: string
  icon: string
  label: string
  action: Function
  bgColor?: string
  textColor?: string
  type?: 'separator'
  condition?: () => boolean
}

export default defineNuxtComponent({
  name: 'IdentitiesTablePage',
  data() {
    return {
      selected: '',
      NewTargetId,
    }
  },
  provide() {
    return {
      tabs: this.tabs,
      deleteIdentity: this.deleteIdentity,
    }
  },
  async setup() {
    const page = ref<typeof Page | null>(null)
    const { hasPermission } = useAccessControl()
    const $route = useRoute()
    const { getDefaults } = usePagination()
    const { debug } = useDebug()

    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const { columns, visibleColumns, columnsType } = useColumnsIdentites()
    const { getStateValue, fetchAllStateCount } = useIdentityStateStore()
    const { getStateName } = useIdentityStates()
    const { countFilters, hasFilters, getFilters, removeFilter } = useFiltersQuery(columns)
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()

    // const queryDebounced = ref({
    //   ...getDefaults(),
    //   ...$route.query,
    // })

    const paginationOptions = useHttpPaginationOptions()

    const {
      data: identities,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<any>('/management/identities', {
      method: 'get',
      // query: queryDebounced,
      ...paginationOptions,
    })

    useHttpPaginationReactive(paginationOptions, execute)

    // watchDebounced(
    //   () => ({ ...getDefaults(), ...$route.query }),
    //   async (newQuery) => {
    //     if (JSON.stringify(newQuery) !== JSON.stringify(queryDebounced.value)) {
    //       queryDebounced.value = newQuery
    //       await execute()
    //     }
    //   },
    //   { debounce: 300, deep: true },
    // )

    // if (queryDebounced.value.limit !== '-1') {
    //   await execute()
    // }

    if (error.value) {
      console.error(error.value)
      throw showError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      })
    }

    return {
      debug,
      page,
      hasPermission,
      identities,
      pending,
      refresh,
      execute,
      getStateName,
      getStateValue,
      toPathWithQueries,
      fetchAllStateCount,
      removeFilter,
      countFilters,
      hasFilters,
      getFilters,
      columns,
      visibleColumns,
      columnsType,
      tabs: [
        {
          name: 'index',
          icon: 'mdi-card-account-details',
          label: 'Fiche identité',
          bgColor: 'primary',
          textColor: 'primary',
          action: (i) => navigateToTab(`/identities/table/${i._id}`),
          condition: () => hasPermission('/management/identities', 'read'),
        },
        {
          name: 'password-history',
          icon: 'mdi-wrench-clock',
          label: 'Historique des mots de passe',
          bgColor: 'teal-7',
          textColor: 'teal-7',
          action: (i) => navigateToTab(`/identities/table/${i._id}/password-history`),
          condition: () => hasPermission('/management/identities', 'read'),
        },
        {
          name: 'audits',
          icon: 'mdi-clipboard-text-clock',
          label: 'Historique des changements',
          bgColor: 'lime-8',
          textColor: 'lime-8',
          action: (i) => navigateToTab(`/identities/table/${i._id}/audits`),
          condition: () => hasPermission('/core/audits', 'read'),
        },
        {
          name: 'jobs',
          icon: 'mdi-book-clock',
          label: 'Journaux des tâches',
          bgColor: 'info',
          textColor: 'info',
          action: (i) => navigateToTab(`/identities/table/${i._id}/jobs`),
          condition: () => hasPermission('/core/jobs', 'read'),
        },
        {
          name: 'lifecycle',
          icon: 'mdi-timeline-clock-outline',
          label: 'Historique des cycles de vie',
          bgColor: 'info',
          textColor: 'info',
          action: (i) => navigateToTab(`/identities/table/${i._id}/lifecycle`),
          condition: () => hasPermission('/management/lifecycle', 'read'),
        },
        { type: 'separator' },
        {
          name: 'debug',
          icon: 'mdi-bug',
          label: 'Debug',
          bgColor: 'orange',
          textColor: 'orange',
          action: (i) => navigateToTab(`/identities/table/${i._id}/debug`),
          condition: () => debug.value,
        },
      ] as TabItem[],
    }
  },
  computed: {
    targetId(): LocationQueryValue[] | string {
      return `${this.$route.params._id || ''}`
    },
  },
  methods: {
    async fetchSyncedTotalCount(): Promise<number> {
      try {
        const { data: identities } = await useHttp<any>(`/management/identities?limit=1&&filters[@state][]=${IdentityState.SYNCED}`, {
          method: 'get',
        })
        const total = Number((identities?.value as any)?.total ?? 0)
        return Number.isFinite(total) ? total : 0
      } catch {
        return 0
      }
    },
    areAllSelectedSynced(selected): boolean {
      if (!Array.isArray(selected) || selected.length === 0) return false
      return selected.every((i) => i?.state === IdentityState.SYNCED)
    },
    openUpdateModal(selected) {
      const identityState: IdentityState = selected[0].state

      if (typeof identityState !== 'number') {
        console.error('Invalid state', identityState)
        return
      }

      const name = this.getStateName(identityState)

      this.$q
        .dialog({
          component: updateIdentityModal,
          componentProps: {
            selectedIdentities: selected,
            identityTypesName: name,
            allIdentitiesCount: this.identities?.total,
          },
        })
        .onOk(async (data) => {
          if (data.syncAllIdentities) {
            await this.updateAllIdentities(identityState)
          } else {
            await this.updateIdentity(selected, identityState)
          }
        })
    },

    openInitModal(selected) {
      if (!this.areAllSelectedSynced(selected)) {
        this.$q.notify({
          message: "L'envoi de l'invitation est disponible uniquement pour des identités synchronisées",
          color: 'warning',
        })
        return
      }
      const identityState: IdentityState = selected[0].state

      if (typeof identityState !== 'number') {
        console.error('Invalid state', identityState)
        return
      }

      const name = this.getStateName(identityState)

      this.fetchSyncedTotalCount().then((syncedTotal) => {
        this.$q
        .dialog({
          component: updateInitModal,
          componentProps: {
            selectedIdentities: selected,
            identityTypesName: name,
            allIdentitiesCount: syncedTotal,
          },
        })
        .onOk(async (data) => {
          if (data.initAllIdentities === true) {
            await this.sendInitToAllIdentities()
          } else {
            await this.sendInitToIdentity(selected)
          }
        })
      })
    },

    openMailTemplateModal(selected) {
      if (!this.areAllSelectedSynced(selected)) {
        this.$q.notify({
          message: "L'envoi de mail (template) est disponible uniquement pour des identités synchronisées",
          color: 'warning',
        })
        return
      }
      const identityState: IdentityState = selected[0].state

      if (typeof identityState !== 'number') {
        console.error('Invalid state', identityState)
        return
      }

      const name = this.getStateName(identityState)

      this.fetchSyncedTotalCount().then((syncedTotal) => {
        this.$q
        .dialog({
          component: mailTemplateModal,
          componentProps: {
            selectedIdentities: selected,
            identityTypesName: name,
            allIdentitiesCount: syncedTotal,
          },
        })
        .onOk(async (data) => {
          if (data.initAllIdentities === true) {
            const { data: identities } = await useHttp<any>('/management/identities?limit=99999', {
              method: 'get',
              query: this.returnFilter(),
            })
            if (!identities) return
            await this.sendTemplateMailToIdentities(identities.value.data, data)
          } else {
            await this.sendTemplateMailToIdentities(selected, data)
          }
        })
      })
    },

    openTrashModal(selected) {
      const identityState: IdentityState = selected[0].state
      if (typeof identityState !== 'number') {
        console.error('Invalid state', identityState)
        return
      }

      this.$q
        .dialog({
          component: deleteManyModal,
          componentProps: {
            selectedIdentities: selected,
          },
        })
        .onOk(async (data) => {
          await this.trashManySelected(selected)
        })
    },

    async updateAllIdentities(state: IdentityState) {
      const f = this.returnFilter()
      const { data: identities } = await useHttp<any>(`/management/identities?limit=999999&&filters[@state][]=${state}`, {
        method: 'get',
        query: f,
      })

      if (!identities) {
        this.$q.notify({
          message: 'Aucune identité à mettre à jour',
          color: 'negative',
        })
        return
      }
      this.updateIdentity(identities.value.data, state)
    },

    async updateIdentity(identities, state: IdentityState) {
      const targetState = this.getTargetState(state)

      const ids = identities.map((identity) => identity._id)
      const { data, error } = await useHttp(`/management/identities/state`, {
        method: 'patch',
        body: {
          ids,
          originState: state,
          targetState,
        },
      })

      if (error.value) {
        this.$q.notify({
          message: error.value.data.message,
          color: 'negative',
        })
        return
      }

      this.$q.notify({
        message: `Les identités ont été mises à jour avec succès`,
        color: 'positive',
      })
      await this.fetchAllStateCount()
      this.refresh()
      ;(this.$refs.twoPan as any).clearSelection()
    },

    async sendInitToIdentity(identities) {
      const ids = identities.map((identity) => identity._id)
      const { data, error } = await useHttp(`/management/passwd/initmany`, {
        method: 'post',
        body: {
          ids,
        },
      })

      if (error.value) {
        this.$q.notify({
          message: error.value.data.message,
          color: 'negative',
        })
        return
      }

      this.$q.notify({
        message: `Les identités ont été mises à jour avec succès`,
        color: 'positive',
      })
      await this.fetchAllStateCount()
      this.refresh()
      ;(this.$refs.twoPan as any).clearSelection()
    },

    async sendTemplateMailToIdentities(identities, data: { template?: string; variables?: Record<string, string> }) {
      const ids = identities.map((identity) => identity._id)
      const { data: result, error } = await useHttp(`/management/mail/sendmany`, {
        method: 'post',
        body: {
          ids,
          template: data?.template,
          variables: data?.variables,
        },
      })

      if (error.value) {
        this.$q.notify({
          message: error.value.data.message,
          color: 'negative',
        })
        return
      }

      const sent = (result.value as any)?.data?.sent ?? 0
      const skipped = (result.value as any)?.data?.skipped ?? 0
      this.$q.notify({
        message: `Mail envoyé (${sent} envoyé${sent > 1 ? 's' : ''}, ${skipped} ignoré${skipped > 1 ? 's' : ''})`,
        color: skipped > 0 ? 'warning' : 'positive',
      })
    },

    async trashManySelected(identities) {
      console.log('trashManySelected', identities)
      const ids = identities.map((identity) => identity._id)
      console.log('trashManySelected', ids)

      try {
        const { data } = await $http.$post(`/core/backends/delete`, {
          body: {
            payload: ids,
          },
        })

        this.$q.notify({
          message: `Les identités ont été supprimées avec succès`,
          color: 'positive',
        })
        await this.fetchAllStateCount()
        this.refresh()
        ;(this.$refs.twoPan as any).clearSelection()
      } catch (error: any) {
        this.$q.notify({
          message: error.data.message,
          color: 'negative',
        })
      }
    },

    async sendInitToAllIdentities() {
      const { data: identities } = await useHttp<any>('/management/identities?limit=99999', {
        method: 'get',
        query: this.returnFilter(),
      })
      if (!identities) {
        this.$q.notify({
          message: 'Aucune identité trouvée',
          color: 'negative',
        })
        return
      }
      this.sendInitToIdentity(identities.value.data)
      this.refresh()
      ;(this.$refs.twoPan as any).clearSelection()
    },

    async deleteIdentity(identity: Record<string, any>) {
      const { deleteButton, cancelDeleteButton } = useModalButtons()
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez-vous vraiment supprimer cette identité ?',
          persistent: true,
          ok: deleteButton.value,
          cancel: cancelDeleteButton.value,
        })
        .onOk(() => {
          this.$http
            .post('/core/backends/delete', { body: { payload: [identity._id] } })
            .then(() => {
              this.$q.notify({
                message: "L'identité a été supprimée.",
                color: 'positive',
                position: 'top-right',
                icon: 'mdi-check-circle-outline',
              })
              this.refresh()
              ;(this.$refs.twoPan as any).clearSelection()
            })
            .catch((error: any) => {
              this.$q.notify({
                message: "Impossible de supprimer l'identité : " + error.response._data.message,
                color: 'negative',
                position: 'top-right',
                icon: 'mdi-alert-circle-outline',
              })
            })
        })
    },
    getTargetState(state: IdentityState) {
      switch (state) {
        case IdentityState.TO_VALIDATE:
          return IdentityState.TO_SYNC

        case IdentityState.ON_ERROR:
          return IdentityState.TO_SYNC

        case IdentityState.SYNCED:
          return IdentityState.TO_SYNC

        default:
          return state
      }
    },
    returnFilter() {
      const rest = this.$route.query

      for (const [key] of Object.entries(rest)) {
        if (key === 'limit' || key === 'skip' || key === 'sort' || key === 'read') {
          delete rest[key]
        }
      }

      return rest
    },
  },
})
</script>
