<template lang="pug">
  q-page.container
    //- pre(v-html="JSON.stringify(expanded)")
    q-table(
      flat bordered dense
      title="Derniers cycles déclenchés"
      :rows="rows"
      :columns="columns"
      row-key="_id"
      v-model:pagination="pagination"
      v-model:expanded="expanded"
      :loading="pending"
      :filter="filter"
      binary-state-sort
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
              q-chip(
                href='javascript:void(0)'
                v-if="props.row?.refId?.inetOrgPerson?.cn"
                @click="open(`/identities?read=${props.row.refId._id}&filters[^inetOrgPerson.cn]=/${props.row?.refId?.inetOrgPerson?.cn}/i&skip=0&limit=16&sort[metadata.lastUpdatedAt]=desc`)"
                icon="mdi-account" clickable dense
              ) {{ props.row?.refId?.inetOrgPerson?.cn }}
              span(v-else) Inconnu
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
import dayjs from 'dayjs'

export default {
  name: 'LifecyclesTablePage',
  data() {
    return {
      filter: ref(''),
      expanded: ref<any[]>([]),
      columns: [
        { name: 'identity', align: 'left', label: 'Identité(e)', field: (row) => row?.refId || {}, sortable: true },
        {
          name: 'lifecycle',
          required: true,
          label: 'Cycle déclanché',
          align: 'left',
          field: (row) => row.lifecycle,
          // format: (lifecycle) => getLifecycleName(lifecycle),
          sortable: false,
        },
        { name: 'date', required: true, label: 'Date', align: 'left', field: (row) => row.date, format: (date) => `${dayjs(date).format('DD/MM/YYYY HH:mm:ss')}`, sortable: true },
      ],
    }
  },
  async setup() {
    const route = useRoute()
    const router = useRouter()

    const { getLifecycleName, getLifecycleIcon, getLifecycleColor } = await useIdentityLifecycles()

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
        // pagination.value.sortBy = sortBy
        // pagination.value.descending = descending
      },
      onResponse({ response }) {
        pagination.value.rowsNumber = response._data.total || 0
      },
      transform: (context: { statusCode: number; data: any[] }) => context?.data || [],
    })

    return {
      pagination,

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
    isDark(): boolean {
      return this.$q.dark.isActive
    },
    monacoOptions() {
      return { theme: this.isDark ? 'vs-dark' : 'vs-light', readOnly: true, minimap: { enabled: true }, scrollBeyondLastColumn: 0, scrollBeyondLastLine: false }
    },
  },
  methods: {
    async onRequest(props) {
      const { page, rowsPerPage: limit, sortBy, descending } = props.pagination
      const filter = props.filter

      console.log('Requesting data with:', { page, limit, sortBy, descending, filter, props })

      await this.router.replace({
        query: {
          ...this.router.currentRoute.value.query,
          page,
          limit,
          // 'sort[date]': descending ? `-${sortBy}` : sortBy,
          // filter,
        },
      })
    },
    expandRow(props) {
      this.expanded = this.expanded.includes(props.row._id) ? [] : [props.row._id]
      // props.expand = !props.expand
    },
    open(path) {
      window.open(path, '_blank')
    },
  },
}
</script>
