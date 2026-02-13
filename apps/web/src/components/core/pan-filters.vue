<template lang="pug">
q-toolbar(dense flat)
  .column.fit
    .flex.q-mt-sm
      //- pre(v-html='JSON.stringify(columnsType)')
      q-input.col(
        v-if='mode === "simple" || mode === "complex"'
        v-model='search'
        label='Recherche'
        :placeholder='placeholder'
        clear-icon='mdi-close'
        :debounce='300'
        dense
        outlined
        clearable
        autofocus
        stacked-label
      )
      q-space(v-if='mode === "advanced"')
      q-btn-group(flat)
        q-btn.q-ml-sm(
          v-if='mode === "complex" || mode === "advanced"'
          color='secondary'
          icon='mdi-filter-variant-plus'
          flat
          dense
        )
          q-tooltip.text-body2.bg-secondary(
            anchor='top middle'
            self='bottom middle'
          )
            span Il y a {{ countFilters }} filtre(s) actif(s)
            br
            small Cliquer pour ajouter des filtres
          span(v-text='mode === "advanced" ? "Ajouter un nouveau filtre" : ""')
          q-popup-proxy(
            anchor='bottom left'
            self='top middle'
            transition-show='scale'
            transition-hide='scale'
          )
            sesame-core-edit-filters(
              title='Ajouter un filtre'
              :columns='columns'
              :columns-type='columnsType'
            )
        q-separator(vertical)
        q-btn-dropdown.text-secondary(
          dropdown-icon="mdi-dots-vertical"
          flat dense
        )
          q-list(dense)
            q-item(@click='removeAllFilters' clickable v-close-popup)
              q-item-section(avatar)
                q-icon(
                  name='mdi-delete'
                  color='negative'
                )
              q-item-section
                q-item-label Retirer tous les filtres
        q-badge.text-black(
          style='margin-right: 8px; margin-top: 4px;'
          v-if='countFilters > 0'
          color='warning'
          align='middle'
          floating
        ) {{ countFilters }}
    .flex.q-mt-sm(v-show='hasFilters')
      template(v-for='(filter, i) in getFilters' :key='filter.field')
        //- pre(v-html='JSON.stringify(filter)')
        q-chip(
          :class="[!columnExists(filter.field) ? 'text-black' : '']"
          @remove="removeFilter(filter)"
          :color="getFilterColor(filter)"
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
            sesame-core-edit-filters(
              title='Modifier le filtre'
              :initial-filter='filter'
              :columns='columns'
              :columns-type='columnsType'
            )
          q-tooltip.text-body2(
            :class="getTooltipColor(filter)"
            anchor='top middle'
            self='bottom middle'
          )
            span(v-if='!columnExists(filter.field)')
              | Cliquer pour modifier le filtre&nbsp;
              small (Le champ "{{ filter.field }}" n'existe pas ou n'est pas reconnu)
            span(v-else) Cliquer pour modifier le filtre
        span.content-center(v-if='i < countFilters - 1') &amp;gt;
</template>

<script lang="ts">
import type { QTableProps } from 'quasar'
import type { LocationQueryValue } from 'vue-router'

export default defineComponent({
  name: 'CorePanFiltersComponent',
  props: {
    mode: {
      type: String as PropType<'simple' | 'complex' | 'advanced'>,
      required: false,
      default: 'simple',
    },
    placeholder: {
      type: String,
      required: false,
      default: 'Rechercher par ...',
    },
    columns: {
      type: Array as PropType<QTableProps['columns'] & { type: string }[]>,
      required: true,
    },
    columnsType: {
      type: Array as PropType<{ name: string; type: string }[]>,
      required: false,
      default: () => [],
    },
  },
  setup({ columns, columnsType }) {
    const { countFilters, hasFilters, getFilters, removeFilter, removeAllFilters } = useFiltersQuery(ref(columns), ref(columnsType))

    return {
      countFilters,
      hasFilters,
      getFilters,
      removeFilter,
      removeAllFilters,
    }
  },
  computed: {
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
    columnExists(field: string) {
      return this.columns.find((col) => col.name === field)
    },
    getFilterColor(filter: { comparator: string; label: string; field: string; search?: string; value?: unknown }) {
      if (this.columnExists(filter.field)) {
        return this.$q.dark.isActive ? 'grey-9' : 'grey-3'
      }

      return this.$q.dark.isActive ? 'amber-9' : 'amber-3'
    },
    getTooltipColor(filter: { comparator: string; label: string; field: string; search?: string; value?: unknown }) {
      const colors = [] as string[]
      if (!this.columnExists(filter.field)) {
        colors.push(this.$q.dark.isActive ? 'bg-amber-9' : 'bg-amber-3')
        colors.push('text-black')
      }

      return colors.join(' ')
    },
  },
})
</script>
