<template lang="pug">
q-page.container.q-pa-sm
  q-card
    q-toolbar(dense flat style='height: 33px;')
      q-toolbar-title Export des identités
      q-btn.q-mx-sm(
        @click="exportData"
        icon="mdi-cloud-download"
        color="positive"
        label="Exporter"
        size="md"
        flat
        dense
      )
      q-select(
        v-model="typeExport"
        :options="optionsExport"
        label="Format d'export"
        style="width:150px;"
        dense
        outlined
      )
    q-toolbar.q-mb-sm(dense flat)
      .column.fit
        .flex.q-mt-sm
          q-input.col(
            v-model='search'
            label='Recherche'
            placeholder='Rechercher par nom, prénom, email, ...'
            clear-icon='mdi-close'
            :debounce='300'
            dense
            outlined
            clearable
            autofocus
            stacked-label
          )
          q-btn.q-ml-sm(
            color='primary'
            icon='mdi-filter-variant'
            flat
            dense
          )
            q-badge(
              v-if='countFilters > 0'
              color='warning'
              floating
            ) {{ countFilters }}
            q-popup-proxy(
              anchor='bottom left'
              self='top middle'
              transition-show='scale'
              transition-hide='scale'
            )
              sesame-pages-identities-filters(
                title='Ajouter un filtre'
                :columns='columns'
              )
        .flex.q-mt-sm(v-show='hasFilters')
          template(v-for='(filter, i) in getFilters' :key='filter.field')
            //- pre(v-html='JSON.stringify(filter)')
            q-chip(
              @remove="removeFilter(filter)"
              :color="$q.dark.isActive ? 'grey-9' : 'grey-3'"
              removable
              clickable
              dense
            )
              | {{ filter.label }}
              q-separator.q-mx-xs(vertical)
              | {{ filter.comparator }}
              q-separator.q-mx-xs(vertical)
              | "{{ filter.search }}"
              q-popup-proxy(
                anchor='bottom left'
                self='top middle'
                transition-show='scale'
                transition-hide='scale'
              )
                sesame-pages-identities-filters(
                  :title='"Modifier le filtre (" + (filter.label || filter.field || "") + ")"'
                  :initial-filter='filter'
                  :columns='columns'
                )
            span.content-center(v-if='i < countFilters - 1') &amp;gt;
    q-table(
        :rows-per-page-options="[20,50,0]"
        :columns="fieldsName"
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
    const { columns, visibleColumns, columnsType } = useColumnsIdentites()
    const { countFilters, hasFilters, getFilters, removeFilter } = useFiltersQuery(columns)

    let rowsData = null
    const queryWithoutRead = computed(() => {
      const { read, ...rest } = route.query
      return {
        limit: 9999,
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

        return allFields.map((enr) => {
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
      visibleColumns,
      columns,
      columnsType,
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
    fieldsList() {
      return this.columns!.reduce((acc: { name: string; label: string; type?: string }[], column) => {
        if (this.visibleColumns!.includes(column.name) && column.name !== 'actions' && column.name !== 'states') {
          const type = this.columnsType.find((type) => type.name === column.name)?.type
          acc.push({
            name: column.name,
            label: column.label,
            type,
          })
        }
        return acc
      }, [])
    },
  },
  methods: {
    async exportData(): Promise<void> {
      if (this.typeExport === 'CSV') {
        const csv = this.toCsv(this.fieldsName, this.identities)
        let blob = new Blob([csv], { type: 'text/csv' })
        let link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = 'sesame-export.csv'
        link.click()
      } else if (this.typeExport === 'JSON') {
        let blob = new Blob([JSON.stringify(this.rowsData)], { type: 'text/json' })
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
