<template lang="pug">
q-card(style='min-width: 40vw;')
  q-toolbar.bg-primary.text-white(dense flat style='height: 32px;')
    q-toolbar-title(v-text='title')
    q-btn(
      icon='mdi-close'
      v-close-popup
      dense
      flat
      round
    )
  q-card-section.q-pb-sm
    .flex.q-col-gutter-md
      q-select.col(
        style='min-width: 180px; max-width: 220px'
        v-model='filter.key'
        :readonly='!!initialFilter?.field'
        :options='columns'
        label='Champ à filtrer'
        option-value='name'
        option-label='label'
        dense
        outlined
        autofocus
        map-options
        emit-value
      )
      q-select.col-1(
        style='min-width: 130px'
        v-model='filter.operator'
        label='Opérateur'
        :options='availableComparators'
        option-value='value'
        option-label='label'
        dense
        outlined
        map-options
        emit-value
        options-dense
      )
        template(v-slot:selected-item="scope")
          q-icon(:name="scope.opt.icon" size="xs")
        template(v-slot:option="scope")
          q-item(v-bind="scope.itemProps")
            q-item-section(avatar)
              q-icon(:name="scope.opt.icon")
            q-item-section
              q-item-label
                span {{ scope.opt.label }}
      q-input.col(
        style='min-width: 300px'
        v-show="!comparator?.multiplefields"
        v-model='filter.value'
        label='Valeur'
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :type='searchInputType'
        @keydown.enter.prevent="writeFilter(filter)"
        dense
        outlined
      )
      q-input.col(
        style='min-width: 200px'
        v-show="comparator?.multiplefields"
        v-model="filter.min"
        :type='searchInputType'
        label="Minimum"
        clearable
        dense
        outlined
      )
      q-input.col(
        style='min-width: 200px'
        v-show="comparator?.multiplefields"
        v-model="filter.max"
        :type='searchInputType'
        label="Maximum"
        clearable
        dense
        outlined
      )
  q-card-actions
    q-space
    q-btn(
      @click='writeFilter(filter)'
      :disabled='!filter.key || !filter.operator || !filter.value'
      label='Valider'
      color='positive'
      icon-right='mdi-check'
      v-close-popup
      dense
    )
</template>

<script lang="ts">
import type { QTableProps } from 'quasar'

type Filter = {
  key: string
  operator: string
  value: string

  min: string
  max: string
}

type InitialFilter = {
  comparator: string
  field: string
  label: string
  querySign: string
  search: string
  value: string
}

export default defineNuxtComponent({
  name: 'CoreEditFiltersComponent',
  props: {
    title: {
      type: String,
      default: 'Ajouter/Modifier un filtre',
    },
    columns: {
      type: Array as () => QTableProps['columns'] & { type: string }[],
      default: () => [],
    },
    columnsType: {
      type: Array as PropType<{ name: string; type: string }[]>,
      required: false,
      default: () => [],
    },
    initialFilter: {
      type: Object as () => InitialFilter,
      default: () => ({}),
    },
  },
  watch: {
    'filter.key': {
      handler() {
        this.fieldType = this.columnsType.find((col) => col.name === this.filter.key)?.type || 'text'
        this.filter.operator = ''
      },
    },
    'filter.operator': {
      handler() {
        this.filter.value = ''
        this.filter.min = ''
        this.filter.max = ''
      },
    },
  },
  setup({ columns, initialFilter }) {
    const { fieldTypes, comparatorTypes, writeFilter } = useFiltersQuery(ref(columns))

    const detectInitialOperator = () => {
      if (!initialFilter || !initialFilter.querySign) return ''
      const candidates = comparatorTypes.value.filter((c) => c.querySign === initialFilter.querySign)
      if (!candidates || candidates.length === 0) return ''
      const raw = initialFilter.value || initialFilter.search || ''
      if (!raw) return candidates[0].value

      // If a comparator label is provided (from getFilters), prefer that exact label
      if (initialFilter.comparator) {
        const byLabel = candidates.find((c) => c.label.toLowerCase() === initialFilter.comparator.toLowerCase())
        if (byLabel) return byLabel.value
      }

      const found = candidates.find((c) => {
        const hasPrefix = c.prefix !== '' && raw.startsWith(c.prefix)
        const hasSuffix = c.suffix !== '' && raw.endsWith(c.suffix)
        if (c.prefix !== '' && c.suffix !== '') return hasPrefix && hasSuffix
        if (c.prefix !== '') return hasPrefix
        if (c.suffix !== '') return hasSuffix
        return false
      })

      return found ? found.value : candidates[0].value
    }

    const stripPrefixSuffix = (raw?: string) => {
      if (!raw) return ''

      let best: { prefix: string; suffix: string } | null = null
      let bestScore = 0

      for (const c of comparatorTypes.value) {
        const p = c.prefix || ''
        const s = c.suffix || ''
        const hasP = p !== '' && raw.startsWith(p)
        const hasS = s !== '' && raw.endsWith(s)
        const score = (hasP ? p.length : 0) + (hasS ? s.length : 0)

        if (score > bestScore) {
          if ((p !== '' && s !== '' && hasP && hasS) || (p !== '' && s === '' && hasP) || (s !== '' && p === '' && hasS)) {
            bestScore = score
            best = { prefix: p, suffix: s }
          }
        }
      }

      if (!best) return raw

      let val = raw
      if (best.prefix) val = val.slice(best.prefix.length)
      if (best.suffix) val = val.slice(0, -best.suffix.length)
      return val
    }

    const fieldType = ref<string>()
    const filter = ref<Filter>({
      key: initialFilter?.field || '',
      operator: detectInitialOperator(),
      value: stripPrefixSuffix(initialFilter?.value) || '',

      min: '',
      max: '',
    })

    return {
      filter,
      fieldType,
      fieldTypes,
      comparatorTypes,
      writeFilter,
    }
  },
  computed: {
    comparator(): { label: string; value: string; prefix?: string; suffix?: string; multiplefields?: boolean } | undefined {
      return this.comparatorTypes.find((comp) => comp.value === this.filter.operator)
    },
    searchInputType(): string {
      if (this.fieldType === undefined || this.fieldType === null) return 'text'
      return this.fieldType
    },
    availableComparators(): { label: string; value: string; prefix?: string; suffix?: string; multiplefields?: boolean }[] {
      if (this.fieldType === undefined || this.fieldType === null) return []
      return this.comparatorTypes.filter((comparator) => {
        return comparator.type.includes(this.fieldType!)
      })
    },
  },
  mounted() {
    this.fieldType = this.columnsType.find((col) => col.name === this.filter.key)?.type || 'text'
  },
})
</script>
