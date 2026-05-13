<template lang="pug">
q-page.grid.q-pa-sm
  q-card.col.full-height.flex.column.outdated-card(flat bordered)
    q-bar.bg-transparent.border-bottom
      q-toolbar-title Identités avec invitation périmées
    .row.items-center.no-wrap.q-px-sm.q-py-xs
      q-btn-group(rounded flat)
        q-btn(
          @click="openInitModale"
          :disable="selected.length === 0"
          color="primary"
          icon="mdi-email-sync"
          size="md"
          rounded
          flat
          dense
        )
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Réenvoyer le mail d'invitation
        q-separator(vertical v-if="selected.length !== 0")
        q-btn(
          v-show="selected.length !== 0"
          @click="clearSelection"
          color="warning"
          icon="mdi-cancel"
          size="md"
          rounded
          flat
          dense
        )
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Nettoyer la sélection
      q-space
      q-btn-group(flat stretch)
        q-btn(flat icon="mdi-table-headers-eye" dense size="md")
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Afficher/cacher des colonnes
          q-menu(max-width="350px" max-height="350px").q-pa-md
            .row
              .col-6(v-for="column in columns" :key="column.name")
                q-toggle.q-mb-sm(v-model="visibleColumns" :label="column.label" :val="column.name" dense)
        q-btn(@click="refresh" icon="mdi-refresh" flat square dense)
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Rafraîchir les données
    .outdated-table-wrapper.col
      q-markup-table.sesame-sticky-last-column-table.sesame-sticky-thead.sesame-bordered-table.outdated-markup-table(dense flat)
        thead
          tr
            th.text-left.outdated-select-cell
              q-checkbox(
                dense
                :model-value="allVisibleSelected"
                :indeterminate="someVisibleSelected && !allVisibleSelected"
                @update:model-value="toggleAllVisible"
              )
            th.text-left(v-for="column in renderedColumns" :key="column.name") {{ column.label }}
            th.text-left.outdated-actions-cell Actions
        tbody
          tr(v-if="pending")
            td.text-left(:colspan="renderedColumns.length + 2")
              .column.items-center.q-gutter-sm.q-py-lg
                q-spinner-gears(size="46px")
                .text-caption Chargement de la liste...
          tr(v-else-if="visibleRows.length === 0")
            td.text-left(:colspan="renderedColumns.length + 2") Aucune donnée
          tr(v-else v-for="row in visibleRows" :key="identityRowIdString(row)")
            td.text-left.outdated-select-cell
              q-checkbox(
                dense
                :model-value="isSelected(row)"
                @update:model-value="toggleRow(row)"
              )
            td.text-left(v-for="column in renderedColumns" :key="column.name") {{ formatCell(column.field(row)) }}
            td.text-left.outdated-actions-cell
              q-btn(:to="identityPath(row)" target="_blank" color="primary" icon="mdi-eye" size="sm" flat round dense)
    q-separator
    .outdated-pagination.row.items-center.justify-end.no-wrap.q-gutter-xs.q-pa-sm
      span.text-caption Lignes par page
      q-select(
        dense
        borderless
        emit-value
        map-options
        options-dense
        style="width: 72px"
        :options="rowsPerPageOptions"
        v-model="rowsPerPage"
        @update:model-value="onRowsPerPageChange"
      )
      span.text-caption {{ paginationLabel }}
      q-btn(
        flat
        round
        dense
        icon="mdi-page-first"
        size="sm"
        :disable="pending || isFirstPage"
        @click="goToFirstPage"
      )
      q-btn(
        flat
        round
        dense
        icon="mdi-chevron-left"
        size="sm"
        :disable="pending || isFirstPage"
        @click="goToPreviousPage"
      )
      q-btn(
        flat
        round
        dense
        icon="mdi-chevron-right"
        size="sm"
        :disable="pending || isLastPage"
        @click="goToNextPage"
      )
      q-btn(
        flat
        round
        dense
        size="sm"
        icon="mdi-page-last"
        :disable="pending || isLastPage"
        @click="goToLastPage"
      )
</template>

<script lang="ts">
import { get } from 'radash'
import updateInitModale from '~/components/pages/identities/modals/update-init.vue'

type Identities = Record<string, unknown>
type HttpError = { response?: { _data?: { message?: string } }; data?: { message?: string } }
type InitOutdatedResponse = { _data?: { data?: { sent?: number; skipped?: number } } }
type OutdatedResponse = { total: number; data: Identities[] }
type HttpGetResponse<T> = { _data?: T } & Partial<T>
type HttpClient = {
  get<T = unknown>(url: string, options?: Record<string, unknown>): Promise<HttpGetResponse<T>>
}
type OutdatedColumn = {
  name: string
  label: string
  field: (row: Record<string, unknown>) => unknown
}
type TableColumns = OutdatedColumn[]
type IdentityColumnDefinition = { key: string; label: string }

const OUTDATED_IDENTITY_COLUMNS: IdentityColumnDefinition[] = [
  { key: 'cn', label: 'cn' },
  { key: 'sn', label: 'sn' },
  { key: 'uid', label: 'uid' },
  { key: 'departmentNumber', label: 'departmentNumber' },
  { key: 'employeeNumber', label: 'employeeNumber' },
  { key: 'employeeType', label: 'employeeType' },
  { key: 'displayName', label: 'displayName' },
  { key: 'facsimileTelephoneNumber', label: 'facsimileTelephoneNumber' },
  { key: 'givenName', label: 'givenName' },
  { key: 'labeledURI', label: 'labeledURI' },
  { key: 'mail', label: 'mail' },
  { key: 'mobile', label: 'mobile' },
  { key: 'postalAddress', label: 'postalAddress' },
  { key: 'preferredLanguage', label: 'preferredLanguage' },
  { key: 'telephoneNumber', label: 'telephoneNumber' },
  { key: 'title', label: 'title' },
]

const OUTDATED_COLUMNS: TableColumns = OUTDATED_IDENTITY_COLUMNS.map(({ key, label }) => {
  const name = `inetOrgPerson.${key}`
  return {
    name,
    field: (row: Record<string, unknown>) => get(row, name, ''),
    label,
    align: 'left' as const,
  }
})

export default defineNuxtComponent({
  name: 'IdentitiesOutdatedPage',
  setup() {
    const route = useRoute()
    const { $http } = useNuxtApp() as unknown as { $http: HttpClient }
    const defaultSortBy = 'metadata.lastUpdatedAt'
    const defaultDescending = true

    const initialSortKey = Object.keys(route.query).find((key) => key.startsWith('sort['))
    const initialSortBy = initialSortKey?.replace('sort[', '').replace(/\]/g, '') || defaultSortBy
    const initialDescending = (initialSortKey ? route.query[initialSortKey] : undefined) === 'asc' ? false : defaultDescending

    const page = ref(Number(route.query.page || 1))
    const rowsPerPage = ref(Number(route.query.limit || 20))
    const sortBy = ref(initialSortBy)
    const descending = ref(initialDescending)
    const rowsNumber = ref(0)
    const rowsPerPageOptions = [
      { label: '20 / page', value: 20 },
      { label: '50 / page', value: 50 },
      { label: '100 / page', value: 100 },
    ]

    const buildQuery = () => {
      const sortDirection = descending.value === false ? 'asc' : 'desc'

      return {
        page: String(page.value || 1),
        limit: String(rowsPerPage.value || 20),
        [`sort[${sortBy.value || defaultSortBy}]`]: sortDirection,
      }
    }

    const outdateds = ref<OutdatedResponse>({ total: 0, data: [] })
    const pending = ref(false)

    const loadOutdateds = async () => {
      if (pending.value) return
      pending.value = true
      try {
        const response = await $http.get<OutdatedResponse>('/management/passwd/ioutdated', {
          query: buildQuery(),
        })
        const payload = response._data ?? response
        rowsNumber.value = Number(payload.total || 0)

        outdateds.value = {
          total: rowsNumber.value,
          data: Array.isArray(payload.data) ? payload.data : [],
        }
      } finally {
        pending.value = false
      }
    }

    const pageCount = computed(() => Math.max(1, Math.ceil(rowsNumber.value / rowsPerPage.value)))
    const isFirstPage = computed(() => page.value <= 1)
    const isLastPage = computed(() => page.value >= pageCount.value)
    const paginationLabel = computed(() => {
      if (rowsNumber.value === 0) return '0 ligne'
      const first = (page.value - 1) * rowsPerPage.value + 1
      const last = Math.min(page.value * rowsPerPage.value, rowsNumber.value)
      return `${first}-${last} sur ${rowsNumber.value} lignes`
    })

    const goToPage = async (targetPage: number) => {
      const nextPage = Math.min(Math.max(targetPage, 1), pageCount.value)
      if (nextPage === page.value) return
      page.value = nextPage
      await loadOutdateds()
    }

    const onRowsPerPageChange = async () => {
      page.value = 1
      await loadOutdateds()
    }

    const goToFirstPage = () => goToPage(1)
    const goToPreviousPage = () => goToPage(page.value - 1)
    const goToNextPage = () => goToPage(page.value + 1)
    const goToLastPage = () => goToPage(pageCount.value)

    onMounted(() => {
      void loadOutdateds()
    })

    return {
      outdateds,
      pending,
      refresh: loadOutdateds,
      page,
      pageCount,
      isFirstPage,
      isLastPage,
      paginationLabel,
      rowsPerPage,
      rowsPerPageOptions,
      onRowsPerPageChange,
      goToFirstPage,
      goToPreviousPage,
      goToNextPage,
      goToLastPage,
    }
  },
  data() {
    return {
      selected: [] as Array<Identities>,
      columns: OUTDATED_COLUMNS,
      visibleColumns: OUTDATED_COLUMNS.map((column) => column.name),
    }
  },
  computed: {
    visibleRows(): Identities[] {
      return Array.isArray(this.outdateds?.data) ? this.outdateds.data : []
    },
    renderedColumns(): TableColumns {
      return this.columns.filter((column) => this.visibleColumns.includes(column.name))
    },
    allVisibleSelected(): boolean {
      return this.visibleRows.length > 0 && this.visibleRows.every((row) => this.isSelected(row))
    },
    someVisibleSelected(): boolean {
      return this.visibleRows.some((row) => this.isSelected(row))
    },
  },
  methods: {
    clearSelection() {
      this.selected = []
    },
    openInitModale() {
      this.$q
        .dialog({
          component: updateInitModale,
          componentProps: {
            selectedIdentities: this.selected,
            identityTypesName: 'périmée',
            allIdentitiesCount: this.outdateds?.total || 0,
          },
        })
        .onOk(async (data: { initAllIdentities?: boolean }) => {
          if (data.initAllIdentities) {
            await this.sendInitToAllIdentities()
          } else {
            await this.sendInitToIdentity(this.selected)
          }
        })
    },
    identityRowIdString(row: Record<string, unknown> | undefined): string {
      if (!row || typeof row !== 'object') return ''
      const id = row._id as unknown
      if (id == null) return ''
      if (typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id)) return id
      if (typeof id === 'object' && id !== null && '$oid' in (id as Record<string, unknown>)) {
        const oid = String((id as Record<string, unknown>).$oid ?? '')
        return /^[a-f0-9]{24}$/i.test(oid) ? oid : ''
      }
      if (typeof id === 'object' && id !== null && typeof (id as { toString?: () => string }).toString === 'function') {
        const s = (id as { toString: () => string }).toString()
        if (/^[a-f0-9]{24}$/i.test(s)) return s
      }
      const s = String(id)
      return /^[a-f0-9]{24}$/i.test(s) ? s : ''
    },
    identityPath(row: Identities): string {
      const id = this.identityRowIdString(row)
      return id ? `/identities/table/${id}` : '/identities/table'
    },
    bulkIdsFromIdentities(identities: Identities[]): string[] {
      if (!Array.isArray(identities)) return []
      return identities.map((identity) => this.identityRowIdString(identity as Record<string, unknown>)).filter((id): id is string => id.length > 0)
    },
    isSelected(row: Identities): boolean {
      const id = this.identityRowIdString(row)
      return id.length > 0 && this.selected.some((selected) => this.identityRowIdString(selected) === id)
    },
    toggleRow(row: Identities) {
      const id = this.identityRowIdString(row)
      if (!id) return
      if (this.isSelected(row)) {
        this.selected = this.selected.filter((selected) => this.identityRowIdString(selected) !== id)
      } else {
        this.selected = [...this.selected, row]
      }
    },
    toggleAllVisible(checked: boolean) {
      if (!checked) {
        const visibleIds = new Set(this.visibleRows.map((row) => this.identityRowIdString(row)))
        this.selected = this.selected.filter((selected) => !visibleIds.has(this.identityRowIdString(selected)))
        return
      }

      const selectedIds = new Set(this.selected.map((selected) => this.identityRowIdString(selected)))
      const missingRows = this.visibleRows.filter((row) => {
        const id = this.identityRowIdString(row)
        return id.length > 0 && !selectedIds.has(id)
      })
      this.selected = [...this.selected, ...missingRows]
    },
    formatCell(value: unknown): string {
      if (Array.isArray(value)) return value.join(', ')
      if (value == null) return ''
      return String(value)
    },
    notifyHttpError(error: unknown, fallback = 'Erreur') {
      const err = error as HttpError
      this.$q.notify({
        message: err?.response?._data?.message ?? err?.data?.message ?? fallback,
        color: 'negative',
      })
    },
    async sendInitToIdentity(identities: Identities[]) {
      const ids = this.bulkIdsFromIdentities(identities)
      if (ids.length === 0) {
        this.$q.notify({
          message: 'Aucune identité valide sélectionnée',
          color: 'warning',
        })
        return
      }

      try {
        await this.$http.post('/management/passwd/initmany', {
          body: {
            ids,
          },
        })

        this.$q.notify({
          message: `Les identités ont été mises à jour avec succès`,
          color: 'positive',
        })
        this.selected = []
        await this.refresh()
      } catch (error: unknown) {
        this.notifyHttpError(error, 'Erreur lors du renvoi des invitations')
      }
    },

    async sendInitToAllIdentities() {
      try {
        const response = (await this.$http.post('/management/passwd/initoutdated', {
          body: {},
        })) as InitOutdatedResponse
        const payload = response._data?.data
        const sent = Number(payload?.sent ?? 0)
        const skipped = Number(payload?.skipped ?? 0)
        this.$q.notify({
          message: `Invitation(s) renvoyée(s) : ${sent}${skipped > 0 ? `, ${skipped} ignorée(s)` : ''}`,
          color: skipped > 0 ? 'warning' : 'positive',
        })
        this.selected = []
        await this.refresh()
      } catch (error: unknown) {
        this.notifyHttpError(error, 'Erreur lors du renvoi des invitations périmées')
      }
    },
  },
})
</script>

<style scoped>
.outdated-card {
  border-right: none;
}

.outdated-table-wrapper {
  min-height: 0;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: auto;
}

.outdated-markup-table {
  display: block;
  width: 100%;
  min-width: 0;
}

.outdated-markup-table :deep(table) {
  table-layout: auto;
  width: max-content !important;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.outdated-markup-table :deep(th),
.outdated-markup-table :deep(td) {
  min-width: 140px;
  white-space: nowrap;
}

.outdated-markup-table :deep(thead tr) {
  position: sticky;
  top: 0;
  z-index: 3;
}

.outdated-select-cell {
  width: 48px !important;
  min-width: 48px !important;
  max-width: 48px;
}

.outdated-actions-cell {
  position: sticky !important;
  right: 0 !important;
  width: 96px !important;
  min-width: 96px !important;
  max-width: 96px;
  border-left: 2px solid rgba(0, 0, 0, 0.12);
  background: #fff;
  box-shadow: -4px 0 6px rgba(0, 0, 0, 0.04);
}

th.outdated-actions-cell {
  z-index: 5 !important;
}

td.outdated-actions-cell {
  z-index: 3 !important;
}

.body--dark .outdated-actions-cell {
  border-left-color: rgba(255, 255, 255, 0.12);
  background: var(--q-dark);
}
</style>
