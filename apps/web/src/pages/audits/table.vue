<template lang="pug">
q-page.container.q-pa-sm
  q-card(bordered square flat style='border-bottom: none;')
    q-card-section.q-pa-none
      q-toolbar(bordered dense style='height: 28px; line-height: 28px;')
        q-toolbar-title Historique global des changements
        q-btn(
          icon='mdi-refresh'
          color='primary'
          flat
          round
          dense
          :loading='loading'
          :disable='loading'
          @click='refreshAudits'
        )
    q-separator
    .row.items-center.q-col-gutter-sm.q-pb-sm
      .col-xs-12.col-md-8
        sesame-core-pan-filters(
          :columns='columns'
          mode='simple'
          placeholder='Rechercher par collection, auteur, operation, ...'
        )
      .col-xs-12.col-md-4.q-mt-sm
        q-select.q-px-sm.q-mx-xs(
          v-model='selectedCollection'
          :options='collectionOptions'
          label='Collection'
          dense
          outlined
          clearable
          clear-icon='mdi-close'
          emit-value
          map-options
          option-label='label'
          option-value='value'
          :loading='loadingCollections'
        )
  q-table(
    flat
    bordered
    dense
    binary-state-sort
    :rows='rows'
    :columns='columns'
    row-key='_id'
    v-model:pagination='pagination'
    :loading='loading'
    :filter='search'
    :rows-per-page-options='[16, 32, 64, 100]'
    :pagination-label='(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`'
    @request='onRequest'
  )
    template(#body-cell-date='props')
      q-td(:props='props')
        span(v-text='$dayjs(props.row?.metadata?.createdAt).format("DD/MM/YYYY HH:mm:ss").toString()')
    template(#body-cell-op='props')
      q-td(:props='props' dense)
        q-chip(
          dense
          size='sm'
          :color='getOperationColor(props.row?.op)'
          text-color='white'
          :label='getOperationLabel(props.row?.op)'
        )
    template(#body-cell-coll='props')
      q-td(:props='props')
        q-chip(size='sm' dense color='blue-grey-2' text-color='dark' :label='props.row?.coll || "N/A"')
    template(#body-cell-document='props')
      q-td(:props='props')
        q-chip.bg-positive.text-white.q-pa-sm(
          v-if='props.row?.coll === "Identities" && props.row?.documentId'
          icon='mdi-account'
          clickable
          dense
          @click='openDocument(props.row)'
        )
          span(v-text='props.row?.documentId')
          q-tooltip.text-body2(anchor='top middle' self='bottom middle')
            span Voir la fiche identité
        q-chip.bg-positive.text-white.q-pa-sm(
          v-else-if='props.row?.coll === "Agents" && props.row?.documentId'
          icon='mdi-account'
          clickable
          dense
          @click='openDocument(props.row)'
        )
          span(v-text='props.row?.documentId')
          q-tooltip.text-body2(anchor='top middle' self='bottom middle')
            span Voir la fiche agent
        q-chip(
          v-else
          size='sm'
          dense
          color='grey-4'
          text-color='dark'
          :label='props.row?.documentId || "N/A"'
        )
    template(#body-cell-author='props')
      q-td(:props='props')
        span(v-text='props.row?.agent?.name || "system"')
    template(#body-cell-changes='props')
      q-td(:props='props')
        .row.items-center.q-gutter-xs
          q-chip(
            v-for='(change, idx) in (props.row?.changes || []).slice(0, 4)'
            :key='`${props.row?._id}-${idx}-${change?.path || ""}`'
            size='sm'
            dense
            color='blue-grey-2'
            text-color='dark'
            :label='formatChangeLabel(change)'
          )
          q-chip(
            v-if='(props.row?.changes?.length || 0) > 4'
            size='sm'
            dense
            color='grey-4'
            text-color='dark'
            :label='`+${(props.row?.changes?.length || 0) - 4}`'
          )
    template(#body-cell-actions='props')
      q-td(:props='props' auto-width)
        q-btn(
          icon='mdi-magnify'
          color='primary'
          flat
          round
          dense
          @click='openDiffModal(props.row)'
        )

  q-dialog(v-model='diffDialog.open' maximized)
    q-card.audit-diff-card
      q-toolbar.bg-orange-8.text-white(dense style='height: 28px; line-height: 28px;')
        q-toolbar-title Différentiel des changements
        q-space
        q-btn(icon='mdi-close' flat round dense v-close-popup)
      q-bar.bg-transparent(dense style='height: 28px; line-height: 28px;')
        q-space
        .text-caption.text-grey-7
          span(v-if='diffDialog.author') Par: {{ diffDialog.author }}
          span(v-if='diffDialog.author && diffDialog.date')  -
          span(v-if='diffDialog.date') Le: {{ diffDialog.date }}
      q-separator
      .q-pa-md.row.justify-center(v-if='diffDialog.loading')
        q-spinner-dots(color='primary' size='40px')
      q-banner.bg-warning.text-black(v-if='!diffDialog.loading && !diffDialog.hasChanges')
        | Aucun changement exploitable trouve dans cette entree d'audit.
      .audit-diff-editor(v-else-if='!diffDialog.loading')
        LazyMonacoDiffEditor(
          style='height: 100%; width: 100%'
          lang='json'
          :original='diffDialog.original'
          :model-value='diffDialog.modified'
          :options='diffOptions'
        )
</template>

<script lang="ts">
import {
  buildAuditDiffFromChanges,
  createDefaultAuditDiffDialogState,
  fetchAuditDetails,
  fetchAuditsRows,
  formatAuditChangeLabel,
  getAuditOperationColor,
  getAuditOperationLabel,
  resolveAuditSortField,
} from '~/composables/useAuditsTable'

export default defineNuxtComponent({
  name: 'AuditsTablePage',
  data() {
    return {
      loading: false,
      rows: [] as any[],
      collectionOptions: [] as Array<{ label: string; value: string }>,
      loadingCollections: false,
      pagination: {
        sortBy: 'date',
        descending: true,
        page: 1,
        rowsPerPage: 16,
        rowsNumber: 0,
      },
      diffDialog: createDefaultAuditDiffDialogState(),
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
    search: {
      get(): string {
        const v = this.$route.query.search || ''
        return `${v}`.replace(/^\*|\*$/g, '')
      },
      set(v: string): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            search: v ? `${v}` : undefined,
            page: '1',
          },
        })
      },
    },
    selectedCollection: {
      get(): string {
        return `${this.$route.query.coll || ''}`
      },
      set(v: string): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            coll: v || undefined,
            page: '1',
          },
        })
      },
    },
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
          name: 'coll',
          label: 'Collection',
          align: 'left',
          field: (row) => row?.coll,
          sortable: true,
        },
        {
          name: 'document',
          label: 'Document',
          align: 'left',
          field: (row) => row?.documentId,
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
    this.fetchCollections()
    this.syncPaginationFromRoute()
    this.fetchAudits({
      page: this.pagination.page,
      limit: this.pagination.rowsPerPage,
      sortBy: this.pagination.sortBy,
      descending: this.pagination.descending,
    })
  },
  watch: {
    '$route.query': {
      handler() {
        this.syncPaginationFromRoute()
        this.fetchAudits({
          page: this.pagination.page,
          limit: this.pagination.rowsPerPage,
          sortBy: this.pagination.sortBy,
          descending: this.pagination.descending,
        })
      },
      deep: true,
    },
  },
  methods: {
    async fetchCollections() {
      this.loadingCollections = true
      try {
        const res = await this.$http.get('/core/audits/collections')
        const values: string[] = res?._data?.data || []
        this.collectionOptions = values.map((value) => ({ label: value, value }))
      } catch (error: any) {
        this.$q.notify({
          message: "Erreur lors du chargement des collections d'audit",
          color: 'negative',
          icon: 'mdi-alert-circle-outline',
          position: 'top-right',
        })
      } finally {
        this.loadingCollections = false
      }
    },
    syncPaginationFromRoute() {
      const nextPage = parseInt(`${this.$route.query.page || '1'}`, 10) || 1
      const nextLimit = parseInt(`${this.$route.query.limit || '16'}`, 10) || 16
      this.pagination.page = nextPage
      this.pagination.rowsPerPage = nextLimit
    },
    async refreshAudits() {
      await this.fetchAudits({
        page: this.pagination.page,
        limit: this.pagination.rowsPerPage,
        sortBy: this.pagination.sortBy,
        descending: this.pagination.descending,
      })
    },
    openDocument(row: any) {
      switch (row?.coll) {
        case 'Identities':
          window.open(`/identities/table/${row.documentId}`, '_blank')
          break
        case 'Agents':
          window.open(`/settings/agents/${row.documentId}`, '_blank')
          break

        default:
          this.$q.notify({
            message: `Cette collection n'est pas encore supportée: ${row?.coll}`,
            color: 'negative',
            icon: 'mdi-alert-circle-outline',
            position: 'top-right',
          })
          break
      }
    },
    getOperationLabel(op: string): string {
      return getAuditOperationLabel(op)
    },
    getOperationColor(op: string): string {
      return getAuditOperationColor(op)
    },
    formatChangeLabel(change: any): string {
      return formatAuditChangeLabel(change)
    },
    toSortField(sortBy: string): string {
      return resolveAuditSortField(sortBy, {
        coll: 'coll',
        document: 'documentId',
      })
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

      try {
        const result = await fetchAuditsRows({
          http: this.$http,
          url: '/core/audits',
          page,
          limit,
          sortBy,
          descending,
          additionalSortFields: {
            coll: 'coll',
            document: 'documentId',
          },
          extraQuery: {
            search: this.search || undefined,
            coll: this.selectedCollection || undefined,
          },
        })
        this.rows = result.rows
        this.pagination.rowsNumber = result.total
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
      const filterValue = props.filter ?? this.search

      this.pagination.page = page
      this.pagination.rowsPerPage = rowsPerPage
      this.pagination.sortBy = sortBy || 'date'
      this.pagination.descending = descending

      await this.$router.replace({
        query: {
          ...this.$route.query,
          page: `${this.pagination.page}`,
          limit: `${this.pagination.rowsPerPage}`,
          search: filterValue ? `${filterValue}` : undefined,
          coll: this.selectedCollection || undefined,
        },
      })
    },
    buildDiffFromChanges(changes: any[]): { original: string; modified: string; hasChanges: boolean } {
      const diff = buildAuditDiffFromChanges(changes)
      if (diff.truncated) {
        this.$q.notify({
          message: 'Diff tronque aux 250 premiers changements pour eviter un timeout memoire',
          color: 'warning',
          icon: 'mdi-alert',
          position: 'top-right',
        })
      }

      return {
        original: diff.original,
        modified: diff.modified,
        hasChanges: diff.hasChanges,
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
        const audit = await fetchAuditDetails(this.$http, row._id)
        const diff = this.buildDiffFromChanges(audit?.changes || [])

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
