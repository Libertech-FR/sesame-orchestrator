<template lang="pug">
q-page.container
  q-table(
    title="Journal des jobs"
    v-model:expanded="expanded"
    :rows="rows || []"
    :columns="columns"
    :rows-per-page-options="[18, 100, 0]"
    row-key="jobId"
    bordered
    dense
    flat
  )
    template(v-slot:top-right)
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
        template(v-slot:append)
          q-icon(name="mdi-filter")
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
import * as Monaco from 'monaco-editor'

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
    const $route = useRoute()
    const query = computed(() => {
      return {
        limit: 2000,
        skip: 0,
        'sort[metadata.lastUpdatedAt]': 'desc',
        ...$route.query,
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
        const data = result?.data?.map((enr) => {
          return enr
        })

        return data || []
      },
      query,
    })

    return {
      monacoOptions,
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
    updateStateFilter(selection: { value: string | null }): void {
      const query = {
        ...this.$route.query,
      }

      if (!selection.value) {
        delete query['filters[:state]']
      } else {
        query['filters[:state]'] = selection.value
      }

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
