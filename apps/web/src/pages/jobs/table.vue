<template lang="pug">
q-page.container.q-pa-sm
  q-card(bordered square flat style='border-bottom: none;')
    q-card-section.q-pa-none
      q-toolbar(bordered dense style='height: 28px; line-height: 28px;')
        q-toolbar-title Journal des jobs
        q-btn(
          icon='mdi-refresh'
          color='primary'
          flat
          round
          dense
          :loading='pending'
          :disable='pending'
          @click='refreshJobs'
        )

    q-separator
    q-toolbar(bordered dense style='height: 28px; line-height: 28px;')
      q-space
      q-select(
        v-model="stateFilter"
        :options="foptions"
        dense
        outlined
        hide-dropdown-icon
        label="Filtrer par état"
        @update:model-value="updateStateFilter"
        style="width: 150px"
        map-options
      )
  q-table(
    flat
    bordered
    dense
    binary-state-sort
    v-model:pagination='pagination'
    v-model:expanded='expanded'
    :rows='rows || []'
    :columns='columns'
    :rows-per-page-options='[16, 32, 64, 100]'
    :loading='pending'
    :pagination-label='(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`'
    row-key='jobId'
    @request='onRequest'
  )
    template(v-slot:top-right)
    template(v-slot:no-data)
      div.text-center.q-pa-md
        span Aucune donnée à afficher.
    template(v-slot:header="props")
      q-tr(:props="props")
        q-th(
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
          class="text-bold"
          v-text="col.label"
        )
        q-th Action
    template(v-slot:body="props")
      q-tr(:props="props" :class="{ 'bg-primary': props.expand, 'text-white': props.expand }")
        q-td(
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
        )
          template(v-if="col.name === 'identity'")
            q-chip.bg-positive.text-white.q-pa-sm(
              v-if="props.row?.concernedTo?.name"
              @click="open(`/identities/table/${props.row?.concernedTo?.id}?filters[^inetOrgPerson.cn]=/${props.row?.concernedTo?.name}/i&skip=0&limit=16&sort[metadata.lastUpdatedAt]=desc`)"
              icon="mdi-account"
              clickable
              dense
            )
              span {{ props.row?.concernedTo?.name }}
              q-tooltip.text-body2(anchor='top middle' self="bottom middle")
                span Voir&nbsp;l'identité&nbsp;
                span(v-text="'(' + props.row?.concernedTo?.id + ')'" class="text-caption")
            q-chip.bg-orange-8.q-pa-sm(
              v-else
              icon="mdi-account-question"
              label="Inconnu"
              dense
            )
          template(v-else-if="col.name === 'state'")
            span {{ col.name === 'state' ? getStatusText(col.value) : col.value }}
          template(v-else)
            span {{ col.value || col.field(props.row) || '' }}
        q-td.text-center(auto-width)
          q-btn(
            size="sm"
            :disable="!props.row?.result"
            :color="getColorState(props.row.state)"
            round
            dense
            @click="expandRow(props)"
            :icon="getIconState(props.row.state)"
          )
            q-tooltip.text-body2(
              v-if='props.row?.result'
              :class='["bg-" + (!this.expanded.includes(props.row.jobId) ? "positive" : "grey-8"), "text-white"]'
              anchor='top middle'
              self="bottom middle"
            )
              span(v-text="!this.expanded.includes(props.row.jobId) ? 'Voir' : 'Cacher'")
              span &nbsp;le&nbsp;résultat&nbsp;du&nbsp;job&nbsp;
              span(v-text="'(' + props.row?.jobId + ')'" class="text-caption")
      q-tr(v-if="props.expand" :props="props")
        q-td(colspan="100%" style="padding: 0")
          MonacoEditor(
            style="height: 45vh; width: 100%"
            :model-value="JSON.stringify(props.row?.result, null, 2)"
            :options="monacoOptions"
            lang="json"
          )
          q-separator.q-my-none(size="8px" color="primary")
</template>

<script lang="ts">
export default defineComponent({
  name: 'JobsIndexPage',
  data() {
    return {
      expanded: [] as string[],
      foptions: [
        { label: 'Ok', value: '9' },
        { label: 'En erreur', value: '-1' },
      ],
    }
  },
  async setup() {
    const { monacoOptions } = useDebug()
    const route = useRoute()
    const router = useRouter()
    const pagination = ref({
      sortBy: 'date',
      descending: true,
      page: route.query.page ? parseInt(route.query.page as string, 10) : 1,
      rowsPerPage: route.query.limit ? parseInt(route.query.limit as string, 10) : 16,
      rowsNumber: 0,
    })
    const query = computed(() => {
      const { page, limit, skip, ...restQuery } = route.query

      return {
        limit: pagination.value.rowsPerPage,
        skip: (pagination.value.page - 1) * pagination.value.rowsPerPage,
        'sort[metadata.lastUpdatedAt]': 'desc',
        ...restQuery,
      }
    })

    const {
      data: rows,
      pending,
      error,
      refresh,
    } = await useHttp<any>('/core/jobs', {
      method: 'GET',
      transform: (result) => {
        return result?.data || []
      },
      onResponse({ response }) {
        pagination.value.rowsNumber = response?._data?.total || 0
      },
      query,
    })

    return {
      monacoOptions,
      router,
      pagination,
      rows,
      pending,
      error,
      refresh,
    }
  },
  computed: {
    columns(): any[] {
      return [
        { name: 'state', title: 'Statut', field: 'state', label: 'Statut' },
        { name: 'jobId', title: 'Job Id', field: 'jobId', align: 'right', label: 'N° Job' },
        {
          name: 'identity',
          title: 'Identité',
          field: (row) => row?.concernedTo || {},
          align: 'left',
          label: 'Identité',
        },
        {
          name: 'action',
          title: 'Action',
          field: 'action',
          align: 'left',
          label: 'Action',
        },
        {
          name: 'date',
          title: 'Date',
          field: (row) => this.$dayjs(row.metadata?.lastUpdatedAt).format('DD/MM/YYYY HH:mm:ss').toString(),
          align: 'left',
          label: 'Date',
        },
      ]
    },
    stateFilter(): string {
      return (this.$route.query['filters[:state]'] as string) || '9'
    },
  },
  methods: {
    async onRequest(props): Promise<void> {
      const { page, rowsPerPage } = props.pagination

      this.pagination.page = page
      this.pagination.rowsPerPage = rowsPerPage

      await this.router.replace({
        query: {
          ...this.$route.query,
          page: `${page}`,
          limit: `${rowsPerPage}`,
        },
      })
    },
    async refreshJobs(): Promise<void> {
      await this.refresh()
    },
    updateStateFilter(selection: { value: string | null }): void {
      const query = {
        ...this.$route.query,
        page: '1',
      }

      if (!selection.value) {
        delete query['filters[:state]']
      } else {
        query['filters[:state]'] = selection.value
      }
      delete query.skip

      this.$router.replace({
        query,
      })
    },
    getColorState(state: number): string {
      switch (state) {
        case -1:
          return 'negative'

        case 9:
          return 'positive'

        case 0:
          return 'warning'

        default:
          return 'primary'
      }
    },
    getStatusText(state: number): string {
      switch (state) {
        case -1:
          return 'ERR'

        case 9:
          return 'OK'
      }

      return '?'
    },
    getIconState(state: number): string {
      switch (state) {
        case -1:
          return 'mdi-account-remove'

        case 9:
          return 'mdi-account-check'

        case 0:
          return 'mdi-account-sync'

        default:
          return 'mdi-account-question'
      }
    },
    open(path): void {
      window.open(path, '_blank')
    },
    expandRow(props): void {
      this.expanded = this.expanded.includes(props.row.jobId) ? [] : [props.row.jobId]
    },
  },
})
</script>
