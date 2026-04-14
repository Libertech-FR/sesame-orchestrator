<template lang="pug">

q-page.grid
  sesame-core-twopan.col(
    ref='twoPan'
    table-title='Suivi des identités supprimées'
    :simple='false'
    :loading='pending'
    :rows='identities?.data || []'
    :total='identities?.total || 0'
    :columns='columns'
    :visible-columns='visibleColumns'
    :refresh='refresh'
    :targetId='targetId'
    row-key='_id'
  )
    template(#top-table)
      sesame-core-pan-filters(:columns='columns' :columnsType='columnsType' mode='complex' :placeholder='"Rechercher par nom, prénom, email, ..."')

    template(#body-cell-states="props")
      q-td
        sesame-pages-identities-states-info(:identity='props.row')
    template(v-slot:row-actions='{ row }')
      q-btn(:to='toPathWithQueries(`/identities/trash/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
      q-btn(
        color='orange-8'
        icon='mdi-restore'
        size='sm'
        flat
        round
        dense
        :disable='!hasPermission("/management/identities", "update")'
        @click='undeleteIdentity(row)'
      )
        q-tooltip.text-body2.bg-negative.text-white(
          v-if='!hasPermission("/management/identities", "update")'
          anchor='top middle'
          self='center middle'
        ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
        q-tooltip.text-body2.bg-orange-8.text-white(
          v-else
          anchor='top middle'
          self='center middle'
        ) Restaurer l'identité
    template(#after-content)
      nuxt-page(ref='page' @refresh='refresh')
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'
import Page from './trash/[_id].vue'
import type { LocationQueryValue } from 'vue-router'

export default defineNuxtComponent({
  name: 'SesamePagesIdentitiesTrashPage',

  async setup() {
    const page = ref<typeof Page | null>(null)
    const $route = useRoute()
    const { hasPermission } = useAccessControl()
    const { getDefaults } = usePagination()
    const { debug } = useDebug()

    const { toPathWithQueries } = useRouteQueries()
    const { columns, visibleColumns, columnsType } = useColumnsIdentites()
    const { getStateValue, fetchAllStateCount } = useIdentityStateStore()
    const { getStateName } = useIdentityStates()
    const { countFilters, hasFilters, getFilters, removeFilter } = useFiltersQuery(columns)

    const computedQuery = computed(() => {
      return {
        ...getDefaults(),
        ...$route.query,
      }
    })
    const queryDebounced = refDebounced(computedQuery, 700)

    const {
      data: identities,
      error,
      pending,
      refresh,
    } = await useHttp<any>('/management/identities/getdeleted', {
      method: 'get',
      query: queryDebounced,
    })
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
    undeleteIdentity(identity) {
      const { confirmButton, cancelDeleteButton } = useModalButtons()
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez-vous vraiment restaurer cette identité ?',
          ok: confirmButton.value,
          cancel: cancelDeleteButton.value,
          persistent: true,
        })
        .onOk(async () => {
          try {
            await this.$http.post('/core/backends/undelete', {
              body: {
                payload: [identity._id],
              },
            })

            this.$q.notify({
              message: "L'identité a été restaurée.",
              color: 'positive',
              position: 'top-right',
              icon: 'mdi-check-circle-outline',
            })
            await this.fetchAllStateCount()
            this.refresh()
          } catch (error: any) {
            this.$q.notify({
              message: "Impossible de restaurer l'identité : " + (error?.response?._data?.message || 'erreur inconnue'),
              color: 'negative',
              position: 'top-right',
              icon: 'mdi-alert-circle-outline',
            })
          }
        })
    },
  },
})
</script>
