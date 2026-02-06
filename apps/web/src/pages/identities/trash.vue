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
    template(#body-cell-states="props")
      q-td
        sesame-pages-identities-states-info(:identity='props.row')
    template(v-slot:row-actions='{ row }')
      q-btn(:to='toPathWithQueries(`/identities/trash/${row._id}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
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
})
</script>
