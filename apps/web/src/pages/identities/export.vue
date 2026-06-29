<template lang="pug">
q-page.container.q-pa-sm
  q-card
    q-toolbar(dense flat style='height: 33px;')
      q-toolbar-title Export des identités
      q-btn.q-mx-sm(
        @click="exportData"
        :disable="exportColumns.length === 0"
        icon="mdi-cloud-download"
        color="positive"
        label="Exporter"
        size="md"
        flat
        dense
      )
        q-tooltip.text-body2(v-if="exportColumns.length === 0" transition-show="scale" transition-hide="scale") Sélectionnez au moins une colonne à exporter
      q-btn-group.q-mx-sm(flat stretch)
        q-btn(flat icon="mdi-table-headers-eye" dense size="md")
          q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Sélectionner les colonnes à exporter
          q-menu(
            anchor="bottom right"
            self="top right"
            content-class="export-columns-menu"
          )
            .q-pa-sm
              .text-subtitle2.q-mb-sm Colonnes à exporter
              .text-caption.text-grey.q-py-md(v-if="!availableExportColumns.length") Aucune colonne disponible
              q-list(v-else dense)
                q-item.export-column-item(
                  v-for="column in availableExportColumns"
                  :key="column.name"
                  dense
                  clickable
                  @click="toggleExportColumn(column.name)"
                )
                  q-item-section(side)
                    q-toggle(
                      v-model="exportVisibleColumns"
                      :val="column.name"
                      dense
                      @click.stop
                    )
                  q-item-section
                    q-item-label.export-column-label(
                      lines="2"
                      :title="column.label.length > 32 ? column.label : undefined"
                    ) {{ column.label }}
      q-select(
        v-model="typeExport"
        :options="optionsExport"
        label="Format d'export"
        style="width:150px;"
        dense
        outlined
      )
    sesame-core-pan-filters(
      :columns='columns'
      :columnsType='columnsType'
      mode='complex'
      :placeholder='"Rechercher par nom, prénom, email, ..."'
      :searchFieldsHint='searchFieldsHint'
      :default-filter-field-paths='DEFAULT_IDENTITY_FILTER_FIELD_PATHS'
      custom-filter-fields-storage-key='identities'
    )
    q-table(
        :rows-per-page-options="[20,50,0]"
        :columns="exportColumns"
        :rows="identities"
        row-key="_id"
        flat
        dense
    )
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'

export default defineNuxtComponent({
  name: 'IdentitiesExportPage',
  data() {
    return {
      separator: ';',
      arraySeparator: ',',
      carrierReturn: '\r\n',
      optionsExport: ['CSV', 'JSON'],
    }
  },
  async setup() {
    const route = useRoute()
    const { columns, columnsType } = useColumnsIdentites()
    const { exportVisibleColumns, initializeExportColumns } = useIdentitiesExportColumns()
    const { countFilters, hasFilters, getFilters, removeFilter } = useFiltersQuery(columns)
    const { getSearchFieldsQuery, buildSearchFieldsHint } = useIdentitySearchFields()
    const searchFieldsHint = computed(() => buildSearchFieldsHint(columns.value))

    let rowsData = null
    const queryWithoutRead = computed(() => {
      const { read, ...rest } = route.query
      return {
        limit: 9999,
        ...getSearchFieldsQuery(),
        ...rest,
      }
    })

    const {
      data: fieldsName,
      pending: pending1,
      error: error1,
    } = await useHttp('/management/identities/validation', {
      method: 'GET',
      transform: (result: any) => {
        const allFields = result.data.flatMap((enr) => {
          return Object.keys(enr[enr.name].properties)
        })

        const columns = allFields.map((enr) => {
          return {
            name: enr,
            field: enr,
            label: enr,
            align: 'left',
            format: (value) => {
              return Array.isArray(value) ? value?.join(', ') : value
            },
          }
        })

        initializeExportColumns(columns.map((col) => col.name))

        return columns
      },
    })

    const {
      data: identities,
      pending,
      error,
      refresh,
    } = await useHttp('/management/identities?sort[inetOrgPerson.cn]=asc', {
      method: 'GET',
      query: queryWithoutRead,
      transform: (result: any) => {
        rowsData = result
        const allFields = result.data.map((enr) => {
          let addF: any = {}
          for (const [key, value] of Object.entries(enr?.additionalFields?.attributes || {})) {
            addF = { ...addF, ...(value as any) }
          }
          const step1 = { ...enr.inetOrgPerson, ...addF }
          return step1
        })
        return allFields
      },
    })

    return {
      exportVisibleColumns,
      columns,
      columnsType,
      searchFieldsHint,
      DEFAULT_IDENTITY_FILTER_FIELD_PATHS,
      fieldsName,
      identities,
      pending,
      error,
      refresh,
      pending1,
      error1,
      rowsData,
      countFilters,
      hasFilters,
      getFilters,
      removeFilter,
    }
  },
  computed: {
    typeExport: {
      get(): string | LocationQueryValue {
        return `${this.$route.query['typeExport'] || 'CSV'}`
      },
      set(v: string): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            typeExport: v,
          },
        })
      },
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
    exportColumns() {
      if (!this.availableExportColumns.length) return []
      return this.availableExportColumns.filter((column) => this.exportVisibleColumns.includes(column.name))
    },
    availableExportColumns() {
      return Array.isArray(this.fieldsName) ? this.fieldsName : []
    },
  },
  methods: {
    toggleExportColumn(columnName: string): void {
      const index = this.exportVisibleColumns.indexOf(columnName)
      if (index === -1) {
        this.exportVisibleColumns.push(columnName)
        return
      }
      this.exportVisibleColumns.splice(index, 1)
    },
    async exportData(): Promise<void> {
      if (this.exportColumns.length === 0) return

      if (this.typeExport === 'CSV') {
        const csv = this.toCsv(this.exportColumns, this.identities)
        let blob = new Blob([csv], { type: 'text/csv' })
        let link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = 'sesame-export.csv'
        link.click()
      } else if (this.typeExport === 'JSON') {
        const fieldNames = this.exportColumns.map((column) => column.name)
        const filteredRows = (this.identities || []).map((row: any) => {
          return fieldNames.reduce((acc: Record<string, unknown>, fieldName: string) => {
            acc[fieldName] = row?.[fieldName]
            return acc
          }, {})
        })
        let blob = new Blob([JSON.stringify(filteredRows, null, 2)], { type: 'text/json' })
        let link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = 'sesame-export.json'
        link.click()
      }
    },
    toCsv(fields, rows): string {
      const lines: string[] = []
      const escape = (s: string) => s.replace(/"/g, '""')
      const fieldNames = Array.isArray(fields) ? fields.map((f: any) => f.name) : Object.entries(fields).map(([, v]: any) => v.name)
      const header = fieldNames.map((n: string) => '"' + escape(n) + '"').join(this.separator)

      for (const [, row] of Object.entries(rows)) {
        const cols = fieldNames.map((key: string) => {
          const val = row?.[key]
          if (val === null || val === undefined) return ''
          if (Array.isArray(val)) return val.map((v: any) => String(v).replace(/"/g, '""')).join(this.arraySeparator)
          if (typeof val === 'string' || typeof val === 'number') return '"' + escape(String(val)) + '"'
          return ''
        })
        lines.push(cols.join(this.separator))
      }

      lines.unshift(header)
      return lines.join(this.carrierReturn)
    },
  },
})
</script>

<style lang="scss">
.export-columns-menu {
  min-width: 320px;
  max-width: 480px;
  max-height: 400px;
  overflow-y: auto;
}

.export-column-item {
  min-height: 36px;
  padding-right: 4px;
}

.export-column-label {
  word-break: break-word;
  line-height: 1.25;
  font-size: 12px;
}
</style>
