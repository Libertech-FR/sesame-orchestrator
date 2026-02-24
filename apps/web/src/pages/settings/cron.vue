<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Tâches Cron'
      ref='twoPan'
      :simple='true'
      :loading='pending'
      :rows='cronTasks?.data || []'
      :total='cronTasks?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='name'
    )
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par nom, description, ...')
      template(v-slot:row-actions='{ row }')
        q-btn(:to='toPathWithQueries(`/settings/cron/${row.name}`)' color='primary' icon='mdi-eye' size='sm' flat round dense)
      template(#body-cell-enabled="props")
        q-td
          q-checkbox(:model-value="props.row.enabled" :disable="true" size="xs")
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { NewTargetId } from '~/constants/variables'

export default defineNuxtComponent({
  name: 'SettingsCronPage',
  data() {
    return {
      NewTargetId,
      visibleColumns: ['name', 'description', 'schedule', 'enabled', 'nextExecution'],
      columns: [
        {
          name: 'name',
          label: 'Nom de la tâche',
          field: (row) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'description',
          label: 'Description',
          field: (row) => row.description,
          align: 'left',
          sortable: true,
        },
        {
          name: 'schedule',
          label: 'Schedule',
          field: (row) => row.schedule,
          align: 'left',
          sortable: true,
        },
        {
          name: 'enabled',
          label: 'Activée',
          field: (row) => row.enabled,
          align: 'left',
          sortable: true,
        },
        {
          name: 'nextExecution',
          label: 'Prochaine exécution',
          field: (row) => this.getNextExecution(row),
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  provide() {
    return {
      refresh: this.refresh,
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()
    const { toPathWithQueries, navigateToTab } = useRouteQueries()

    const paginationOptions = useHttpPaginationOptions()

    const {
      data: cronTasks,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<any>('/core/cron', {
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
      cronTasks,
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
    getNextExecution(cronTask: any): string {
      const nextExecution = cronTask?._job?.nextExecution
      if (nextExecution) {
        return this.$dayjs(nextExecution).format('DD/MM/YYYY HH:mm:ss')
      }
      return 'N/A'
    },
  },
})
</script>
