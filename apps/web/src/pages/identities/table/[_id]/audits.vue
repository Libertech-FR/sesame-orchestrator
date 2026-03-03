<template lang="pug">
div.q-pa-md
  q-card(bordered square flat style='border-bottom: none;')
    q-card-section.q-pa-none
      q-toolbar(bordered dense style="height: 28px; line-height: 28px;")
        q-toolbar-title Historique des changements
        q-space
        q-btn(
          icon="mdi-refresh"
          color="primary"
          flat
          round
          dense
          :loading="loading"
          :disable="loading"
          @click="refreshAudits"
        )
  q-table(
    flat
    bordered
    dense
    :pagination-label="(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`"
    :rows="rows"
    :columns="columns"
    row-key="_id"
    v-model:pagination="pagination"
    :loading="loading"
    @request="onRequest"
  )
    template(#body-cell-date="props")
      q-td(:props="props")
        span(v-text="$dayjs(props.row?.metadata?.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()")
    template(#body-cell-op="props")
      q-td(:props="props" dense)
        q-chip(
          dense
          size="sm"
          :color="getOperationColor(props.row?.op)"
          text-color="white"
          :label="getOperationLabel(props.row?.op)"
        )
    template(#body-cell-author="props")
      q-td(:props="props")
        span(v-text="props.row?.agent?.name || 'system'")
    template(#body-cell-changes="props")
      q-td(:props="props")
        .row.items-center.q-gutter-xs
          q-chip(
            v-for="(change, idx) in (props.row?.changes || []).slice(0, 4)"
            :key="`${props.row?._id}-${idx}-${change?.path || ''}`"
            size="sm"
            dense
            color="blue-grey-2"
            text-color="dark"
            :label="formatChangeLabel(change)"
          )
          q-chip(
            v-if="(props.row?.changes?.length || 0) > 4"
            size="sm"
            dense
            color="grey-4"
            text-color="dark"
            :label="`+${(props.row?.changes?.length || 0) - 4}`"
          )
    template(#body-cell-actions="props")
      q-td(:props="props" auto-width)
        q-btn(
          icon="mdi-magnify"
          color="primary"
          flat
          round
          dense
          @click="openDiffModal(props.row)"
        )

  q-dialog(v-model="diffDialog.open" maximized)
    q-card.audit-diff-card
      q-toolbar.bg-orange-8.text-white(dense style="height: 28px; line-height: 28px;")
        q-toolbar-title Différentiel des changements
        q-space
        q-btn(icon="mdi-close" flat round dense v-close-popup)
      q-bar.bg-transparent(dense style="height: 28px; line-height: 28px;")
        q-space
        .text-caption.text-grey-7
          span(v-if="diffDialog.author") Par: {{ diffDialog.author }}
          span(v-if="diffDialog.author && diffDialog.date")  -  
          span(v-if="diffDialog.date") Le: {{ diffDialog.date }}
      q-separator
      .q-pa-md.row.justify-center(v-if="diffDialog.loading")
        q-spinner-dots(color="primary" size="40px")
      q-banner.bg-warning.text-black(v-if="!diffDialog.loading && !diffDialog.hasChanges")
        | Aucun changement exploitable trouve dans cette entree d'audit.
      .audit-diff-editor(v-else-if="!diffDialog.loading")
        MonacoDiffEditor(
          style="height: 100%; width: 100%"
          lang="json"
          :original="diffDialog.original"
          :model-value="diffDialog.modified"
          :options="diffOptions"
        )
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesIdAuditsPage',
  data() {
    return {
      loading: false,
      rows: [] as any[],
      pagination: {
        sortBy: 'date',
        descending: true,
        page: 1,
        rowsPerPage: 10,
        rowsNumber: 0,
      },
      diffDialog: {
        open: false,
        loading: false,
        hasChanges: false,
        original: '',
        modified: '',
        author: '',
        date: '',
      },
      maxChangesForDiff: 250,
      maxStringLength: 2000,
      maxDepth: 6,
      maxArrayItems: 100,
      maxObjectKeys: 100,
      maxJsonLength: 120000,
      minLoadingMs: 350,
    }
  },
  setup() {
    const { monacoOptions } = useDebug()
    const diffOptions = computed(() => ({
      ...monacoOptions.value,
      renderSideBySide: true,
      minimap: { enabled: false },
    }))

    return {
      diffOptions,
    }
  },
  computed: {
    columns() {
      return [
        {
          name: 'date',
          required: true,
          label: 'Date',
          align: 'left',
          field: (row) => row?.metadata?.createdAt,
          sortable: true,
        },
        {
          name: 'op',
          label: 'Operation',
          align: 'left',
          field: (row) => row?.op,
          sortable: true,
        },
        {
          name: 'author',
          label: 'Auteur',
          align: 'left',
          field: (row) => row?.agent?.name || 'system',
          sortable: true,
        },
        {
          name: 'changes',
          label: 'Changements',
          align: 'left',
          field: (row) => row?.changes || [],
          sortable: false,
        },
        {
          name: 'actions',
          label: '',
          align: 'center',
          field: () => '',
          sortable: false,
        },
      ]
    },
  },
  mounted() {
    this.fetchAudits({
      page: this.pagination.page,
      limit: this.pagination.rowsPerPage,
      sortBy: this.pagination.sortBy,
      descending: this.pagination.descending,
    })
  },
  methods: {
    async refreshAudits() {
      await this.fetchAudits({
        page: this.pagination.page,
        limit: this.pagination.rowsPerPage,
        sortBy: this.pagination.sortBy,
        descending: this.pagination.descending,
      })
    },
    getOperationLabel(op: string): string {
      switch (op) {
        case 'insert':
          return 'Creation'
        case 'update':
          return 'Mise a jour'
        case 'delete':
          return 'Suppression'
        case 'replace':
          return 'Remplacement'
        default:
          return op || 'Inconnue'
      }
    },
    getOperationColor(op: string): string {
      switch (op) {
        case 'insert':
          return 'positive'
        case 'update':
          return 'primary'
        case 'delete':
          return 'negative'
        case 'replace':
          return 'warning'
        default:
          return 'grey-7'
      }
    },
    formatChangeLabel(change: any): string {
      const path = change?.path || 'unknown'
      const type = change?.type || 'CHANGE'
      return `${type}: ${path}`
    },
    toSortField(sortBy: string): string {
      if (sortBy === 'author') return 'agent.name'
      if (sortBy === 'op') return 'op'
      return 'metadata.createdAt'
    },
    async fetchAudits({
      page,
      limit,
      sortBy,
      descending,
    }: {
      page: number
      limit: number
      sortBy: string
      descending: boolean
    }) {
      const loadingStartedAt = Date.now()
      this.loading = true
      const documentId = this.$route.params._id as string
      const coll = 'Identities'
      const sortField = this.toSortField(sortBy)

      try {
        const res = await this.$http.get(`/core/audits/${coll}/${documentId}`, {
          query: {
            page,
            limit,
            [`sort[${sortField}]`]: descending ? 'desc' : 'asc',
          },
        })

        this.rows = res?._data?.data || []
        this.pagination.rowsNumber = res?._data?.total || 0
      } catch (error: any) {
        this.$q.notify({
          message: "Erreur lors du chargement de l'historique des audits",
          color: 'negative',
          icon: 'mdi-alert-circle-outline',
          position: 'top-right',
        })
      } finally {
        const elapsedMs = Date.now() - loadingStartedAt
        const remainingMs = this.minLoadingMs - elapsedMs
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs))
        }
        this.loading = false
      }
    },
    async onRequest(props) {
      const { page, rowsPerPage, sortBy, descending } = props.pagination

      this.pagination.page = page
      this.pagination.rowsPerPage = rowsPerPage
      this.pagination.sortBy = sortBy || 'date'
      this.pagination.descending = descending

      await this.fetchAudits({
        page: this.pagination.page,
        limit: this.pagination.rowsPerPage,
        sortBy: this.pagination.sortBy,
        descending: this.pagination.descending,
      })
    },
    sanitizeDetailedValue(value: any, depth = 0): any {
      if (value === null || value === undefined) return value

      if (depth >= this.maxDepth) {
        return '[truncated: max depth reached]'
      }

      if (typeof value === 'string') {
        if (value.length <= this.maxStringLength) return value
        return `${value.slice(0, this.maxStringLength)}...[truncated ${value.length - this.maxStringLength} chars]`
      }

      if (typeof value === 'number' || typeof value === 'boolean') {
        return value
      }

      if (Array.isArray(value)) {
        const sliced = value.slice(0, this.maxArrayItems).map((item) => this.sanitizeDetailedValue(item, depth + 1))
        if (value.length > this.maxArrayItems) {
          return [
            ...sliced,
            `[truncated: ${value.length - this.maxArrayItems} more items]`,
          ]
        }
        return sliced
      }

      if (typeof value === 'object') {
        const entries = Object.entries(value)
        const slicedEntries = entries.slice(0, this.maxObjectKeys)
        const sanitized: Record<string, any> = {}

        for (const [key, child] of slicedEntries) {
          sanitized[key] = this.sanitizeDetailedValue(child, depth + 1)
        }

        if (entries.length > this.maxObjectKeys) {
          sanitized.__truncatedKeys = `[truncated: ${entries.length - this.maxObjectKeys} more keys]`
        }

        return sanitized
      }

      return String(value)
    },
    stringifyDiffPayload(payload: Record<string, any>): string {
      const json = JSON.stringify(payload, null, 2)
      if (json.length <= this.maxJsonLength) return json
      return `${json.slice(0, this.maxJsonLength)}\n...[truncated ${json.length - this.maxJsonLength} chars]`
    },
    buildDiffFromChanges(changes: any[]): { original: string; modified: string; hasChanges: boolean } {
      if (!Array.isArray(changes) || changes.length === 0) {
        return {
          original: '',
          modified: '',
          hasChanges: false,
        }
      }

      const originalObject: Record<string, any> = {}
      const modifiedObject: Record<string, any> = {}
      const selectedChanges = changes.slice(0, this.maxChangesForDiff)

      for (const change of selectedChanges) {
        const path = Array.isArray(change?.path) ? change.path.join('.') : `${change?.path || ''}`
        if (!path) continue

        switch (change?.type) {
          case 'CHANGE':
            if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
              originalObject[path] = this.sanitizeDetailedValue(change.oldValue)
            }
            if (Object.prototype.hasOwnProperty.call(change, 'value')) {
              modifiedObject[path] = this.sanitizeDetailedValue(change.value)
            }
            break
          case 'CREATE':
            if (Object.prototype.hasOwnProperty.call(change, 'value')) {
              modifiedObject[path] = this.sanitizeDetailedValue(change.value)
            }
            break
          case 'REMOVE':
            if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
              originalObject[path] = this.sanitizeDetailedValue(change.oldValue)
            }
            break
          default:
            if (Object.prototype.hasOwnProperty.call(change, 'oldValue')) {
              originalObject[path] = this.sanitizeDetailedValue(change.oldValue)
            }
            if (Object.prototype.hasOwnProperty.call(change, 'value')) {
              modifiedObject[path] = this.sanitizeDetailedValue(change.value)
            }
        }
      }

      if (changes.length > this.maxChangesForDiff) {
        this.$q.notify({
          message: `Diff tronque aux ${this.maxChangesForDiff} premiers changements pour eviter un timeout memoire`,
          color: 'warning',
          icon: 'mdi-alert',
          position: 'top-right',
        })
      }

      return {
        original: this.stringifyDiffPayload(originalObject),
        modified: this.stringifyDiffPayload(modifiedObject),
        hasChanges: true,
      }
    },
    async openDiffModal(row: any) {
      this.diffDialog.open = true
      this.diffDialog.loading = true
      this.diffDialog.hasChanges = false
      this.diffDialog.original = ''
      this.diffDialog.modified = ''
      this.diffDialog.author = row?.agent?.name || 'system'
      this.diffDialog.date = row?.metadata?.createdAt
        ? this.$dayjs(row.metadata.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()
        : ''

      try {
        const res = await this.$http.get(`/core/audits/${row._id}`)
        const audit = res?._data?.data || {}
        const diff = this.buildDiffFromChanges(res?._data?.data?.changes || [])

        this.diffDialog.original = diff.original
        this.diffDialog.modified = diff.modified
        this.diffDialog.hasChanges = diff.hasChanges
        this.diffDialog.author = audit?.agent?.name || this.diffDialog.author
        this.diffDialog.date = audit?.metadata?.createdAt
          ? this.$dayjs(audit.metadata.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()
          : this.diffDialog.date
      } catch (error: any) {
        this.$q.notify({
          message: "Erreur lors du chargement du detail de l'audit",
          color: 'negative',
          icon: 'mdi-alert-circle-outline',
          position: 'top-right',
        })
      } finally {
        this.diffDialog.loading = false
      }
    },
  },
})
</script>

<style scoped>
.audit-diff-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.audit-diff-editor {
  flex: 1;
  min-height: 0;
}
</style>