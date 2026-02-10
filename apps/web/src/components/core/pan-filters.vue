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
      q-btn.q-ml-sm(
        v-if='mode === "complex" || mode === "advanced"'
        color='primary'
        icon='mdi-filter-variant'
        flat
        dense
      )
        span(v-text='mode === "advanced" ? "Ajouter un nouveau filtre" : ""')
        q-badge.text-black(
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
          sesame-core-edit-filters(
            title='Ajouter un filtre'
            :columns='columns'
            :columns-type='columnsType'
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
            sesame-core-edit-filters(
              :title='"Modifier le filtre (" + (filter.label || filter.field || "") + ")"'
              :initial-filter='filter'
              :columns='columns'
              :columns-type='columnsType'
            )
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
  setup({ columns }) {
    const { countFilters, hasFilters, getFilters, removeFilter } = useFiltersQuery(ref(columns))

    return {
      countFilters,
      hasFilters,
      getFilters,
      removeFilter,
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
})
</script>
