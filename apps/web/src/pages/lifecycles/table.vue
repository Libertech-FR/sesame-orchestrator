<template lang="pug">
  q-page.container.q-pa-sm
    q-card(bordered square flat style='border-bottom: none;')
      q-card-section.q-pa-none
        q-toolbar(bordered dense style='height: 28px; line-height: 28px;')
          q-toolbar-title Derniers cycles déclenchés
          q-btn(
            icon='mdi-refresh'
            color='primary'
            flat
            round
            dense
            :loading='pending'
            :disable='pending'
            @click='refreshLifecycles'
          )
      q-separator
      q-toolbar(bordered dense style='height: 28px; line-height: 28px;')
        q-space
        q-select(
          v-model='selectedLifecycle'
          :options='lifecycleOptions'
          dense
          outlined
          clearable
          clear-icon='mdi-close'
          hide-dropdown-icon
          label='Filtrer par cycle'
          style='width: 210px'
          emit-value
          map-options
          option-label='label'
          option-value='value'
        )
    q-table(
      flat
      bordered
      dense
      binary-state-sort
      :rows="rows || []"
      :columns="columns"
      row-key="_id"
      v-model:pagination="pagination"
      v-model:expanded="expanded"
      :rows-per-page-options='[16, 32, 64, 100]'
      :pagination-label='(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`'
      :loading="pending"
      :filter="filter"
      @request="onRequest"
    )
      template(#header="props")
        q-tr(:props="props")
          q-th.text-bold(
            v-for="col in props.cols"
            :key="col.name" :props="props"
          ) {{ col.label }}
          q-th
      template(#body="props")
        q-tr(:props="props" :class="{ 'bg-primary': props.expand, 'text-white': props.expand }")
          q-td(
            v-for="col in props.cols.filter(c => c.name !== 'expand')"
            :key="col.name"
            :props="props"
          )
            template(v-if="col.name === 'lifecycle'")
              q-icon(:name="getLifecycleIcon(props.row.lifecycle)" :color="getLifecycleColor(props.row.lifecycle)" :style='{color: getLifecycleColor(props?.row?.lifecycle).startsWith("#") ? getLifecycleColor(props?.row?.lifecycle) : "inherit"}' left)
              span {{ getLifecycleName(props.row.lifecycle) }} &nbsp;
              small(v-text="'(' + props.row?.lifecycle + ')'")
            template(v-else-if="col.name === 'identity'")
              q-chip.bg-positive.text-white.q-pa-sm(
                href='javascript:void(0)'
                v-if="props.row?.refId?.inetOrgPerson?.cn"
                @click="open(`/identities/table/${props.row.refId._id}?filters[^inetOrgPerson.cn]=/${props.row?.refId?.inetOrgPerson?.cn}/i&skip=0&limit=16&sort[metadata.lastUpdatedAt]=desc`)"
                icon="mdi-account" clickable dense
              )
                span {{ props.row?.refId?.inetOrgPerson?.cn }}
                q-tooltip.text-body2(anchor='top middle' self="bottom middle")
                  span Voir&nbsp;l'identité&nbsp;
                  span(v-text="'(' + props.row?.refId?._id + ')'" class="text-caption")
              q-chip.bg-orange-8.q-pa-sm(
                v-else
                icon="mdi-account-question"
                label="Inconnu"
                dense
              )
            template(v-else)
              span {{ col.value || col.field(props.row) || "" }}
          q-td.text-center(auto-width)
            q-btn(
              @click="expandRow(props)"
              :icon="props.expand ? 'mdi-minus' : 'mdi-plus'"
              :disable="!props.row"
              size="sm" color="secondary"
              round dense elevation="0"
            )
        q-tr(v-if="props.expand" :props="props")
          q-td(colspan="100%" style="padding: 0;")
            MonacoEditor(
              :model-value="JSON.stringify(props.row, null, 2)"
              lang="json"
              :options="monacoOptions"
              style="height: 35vh; width: 100%"
            )
            q-separator(class="q-my-none" size="8px" color="primary")
</template>

<script lang="ts">
export default defineComponent({
  name: 'LifecyclesTablePage',
  data() {
    return {
      filter: ref(''),
      expanded: ref<any[]>([]),
    }
  },
  async setup() {
    const { monacoOptions } = useDebug()
    const route = useRoute()
    const router = useRouter()

    const { getLifecycleName, getLifecycleIcon, getLifecycleColor, stateList } = await useIdentityLifecycles()

    const pagination = ref({
      sortBy: 'desc',
      descending: false,
      page: route.query.page ? parseInt(route.query.page as string, 10) : 1,
      rowsPerPage: route.query.limit ? parseInt(route.query.limit as string, 10) : 16,
      rowsNumber: 0,
    })

    const query = computed(() => {
      return { page: pagination.value.page, limit: pagination.value.rowsPerPage, 'sort[date]': 'desc', ...route.query }
    })

    const {
      data: rows,
      pending,
      error,
      refresh,
    } = await useHttp(`/management/lifecycle/recent`, {
      method: 'GET',
      query,
      onRequest() {
        pagination.value.page = parseInt(route.query.page as string, 10) || 1
        pagination.value.rowsPerPage = parseInt(route.query.limit as string, 10) || 16
      },
      onResponse({ response }) {
        pagination.value.rowsNumber = response._data.total || 0
      },
      transform: (context: { statusCode: number; data: any[] }) => context?.data || [],
    })

    return {
      monacoOptions,
      pagination,
      lifecycleOptions: computed(() => stateList.value.map((state) => ({
        label: state?.label || state?.key || 'Inconnu',
        value: state?.key,
      }))),

      getLifecycleName,
      getLifecycleIcon,
      getLifecycleColor,

      rows,
      pending,
      error,
      refresh,

      router,
    }
  },
  computed: {
    selectedLifecycle: {
      get(): string | undefined {
        const lifecycle = this.$route.query.lifecycle
        return lifecycle ? `${lifecycle}` : undefined
      },
      set(v: string | undefined): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            lifecycle: v || undefined,
            page: '1',
          },
        })
      },
    },
    columns() {
      return [
        {
          name: 'identity',
          align: 'left',
          label: 'Identité(e)',
          field: (row) => row?.refId || {},
          sortable: true,
        },
        {
          name: 'lifecycle',
          required: true,
          label: 'Cycle déclanché',
          align: 'left',
          field: (row) => row.lifecycle,
          sortable: false,
        },
        {
          name: 'date',
          required: true,
          label: 'Date',
          align: 'left',
          field: (row) => row.date,
          format: (date) => `${this.$dayjs(date).format('DD/MM/YYYY HH:mm:ss')}`,
          sortable: true,
        },
      ]
    },
  },
  methods: {
    async refreshLifecycles() {
      await this.refresh()
    },
    async onRequest(props) {
      const { page, rowsPerPage: limit, sortBy, descending } = props.pagination
      const filter = props.filter

      await this.router.replace({
        query: {
          ...this.router.currentRoute.value.query,
          page,
          limit,
        },
      })
    },
    expandRow(props) {
      this.expanded = this.expanded.includes(props.row._id) ? [] : [props.row._id]
    },
    open(path) {
      window.open(path, '_blank')
    },
  },
})
</script>
