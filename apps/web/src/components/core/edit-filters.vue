<template lang="pug">
q-card.transparent(style='min-width: 45vw; max-width: 90vw')
  q-toolbar.bg-secondary.text-white(dense flat style='height: 32px;')
    q-toolbar-title
      span {{ title }}&nbsp;
      small
        i(v-if='initialFilter.label') <{{ initialFilter.label }}>
      q-chip(
        @click='copy(initialFilter.field || "")'
        v-if='initialFilter && initialFilter.field'
        :color='$q.dark.isActive ? "amber-9" : "amber-3"'
        text-color='black'
        size='xs'
        class='q-ml-sm'
        clickable
      ) {{ initialFilter.field }}
        q-tooltip(anchor='top middle' self='bottom middle') Copier le champ
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
        ref='field'
        style='min-width: 150px; max-width: 220px'
        v-model='filter.key'
        :readonly='!!initialFilter?.field'
        :use-input='!initialFilter?.field'
        :options='filterOptions'
        label='Champ à filtrer'
        option-value='name'
        option-label='label'
        input-debounce="100"
        @new-value="createValue"
        @filter="filterFn"
        dense
        outlined
        use-chips
        autofocus
        map-options
        emit-value
      )
        template(v-slot:selected-item="scope")
          //- pre(v-html='JSON.stringify(scope)')
          q-chip(
            :class="[!columnExists(scope.opt.name || scope.opt) ? 'text-black' : '']"
            :color="!columnExists(scope.opt.name || scope.opt) ? ($q.dark.isActive ? 'amber-9' : 'amber-3') : ''"
            dense
          )
            | {{ scope.opt.label || scope.opt.name || scope.opt }}
        template(#no-option="{ inputValue }")
          q-item(clickable @click="triggerEnter")
            q-item-section
              q-item-label
                | Ajouter le filtre personnalisé
                | &nbsp;
                code <{{ inputValue }}>
      q-select.col-1(
        style='min-width: 120px'
        v-model='fieldType'
        label='Type'
        :options='["text", "number", "date", "boolean", "array"]'
        :readonly='!filter.key || !!columnExists(filter.key || "")'
        dense
        outlined
        options-dense
      )
      q-select.col-1(
        style='min-width: 130px'
        v-model='filter.operator'
        label='Opérateur'
        :options='availableComparators'
        :readonly='!filter.key'
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
        v-if="!comparator?.multiplefields && optionsMapping.length === 0 && comparator?.querySign !== '?'"
        v-model='filter.value'
        label='Valeur'
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :readonly='!filter.operator'
        :type='searchInputType === "date" ? "datetime-local" : searchInputType'
        @keydown.enter.prevent="writeFilter(filter)"
        dense
        outlined
      )
      q-toggle(
        style='min-width: 140px'
        v-if="!comparator?.multiplefields && comparator?.querySign === '?'"
        v-model="filter.value"
        :readonly='!filter.operator'
        :label="filter.value ? 'Positif' : 'Négatif'"
        true-value="true"
        false-value="false"
        color="gray"
        dense
      )
      q-select.col(
        style='min-width: 300px'
        v-if="!comparator?.multiplefields && optionsMapping.length > 0"
        v-model='filter.value'
        label='Valeur'
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :type='searchInputType'
        :readonly='!filter.operator'
        @keydown.enter.prevent="writeFilter(filter)"
        :options="optionsMapping"
        emit-value
        use-chips
        map-options
        dense
        outlined
      )
      q-input.col(
        style='min-width: 200px'
        v-if="comparator?.multiplefields && comparator?.querySign === '<<'"
        v-model="filter.min"
        :type='searchInputType'
        :readonly='!filter.operator'
        label="Minimum"
        clearable
        dense
        outlined
      )
      q-input.col(
        style='min-width: 200px'
        v-if="comparator?.multiplefields && comparator?.querySign === '<<'"
        v-model="filter.max"
        :type='searchInputType'
        :readonly='!filter.operator'
        label="Maximum"
        clearable
        dense
        outlined
      )
      q-select.col(
        style='min-width: 300px'
        v-if="comparator?.multiplefields && comparator?.querySign === '@'"
        v-model="filter.items"
        label="Valeur"
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :type='searchInputType'
        :options="optionsMapping"
        :readonly='!filter.operator'
        input-debounce="100"
        new-value-mode="add-unique"
        emit-value
        map-options
        fill-input
        use-input
        use-chips
        multiple
        dense
        outlined
      )
  q-card-actions
    q-space
    q-btn(
      @click='writeFilter(filter)'
      :disabled='!filter.key || !filter.operator || (typeof filter.value === "undefined" && !filter.items?.length)'
      label='Valider'
      color='positive'
      icon-right='mdi-check'
      v-close-popup
      dense
    )
</template>

<script lang="ts">
import { copyToClipboard } from 'quasar'
import type { QTableProps } from 'quasar'
import dayjs from 'dayjs'

type Filter = {
  operator: string
  key: string | undefined
  value: string | number | boolean | undefined

  min?: string
  max?: string

  items?: (string | number)[]
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
      type: Array as PropType<{ name: string; type: string; valueMapping?: Record<string, string> }[]>,
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
        if (this.comparator?.multiplefields) {
          this.filter.value = undefined
        } else if (this.filter.items && this.filter.items.length > 0) {
          this.filter.items = []
        } else {
          this.filter.min = ''
          this.filter.max = ''
        }
      },
    },
  },
  data() {
    return {
      filterOptions: [] as { name: string; label: string }[],
    }
  },
  setup({ columns, initialFilter, columnsType }) {
    console.log('initialFilter', initialFilter)
    const { fieldTypes, comparatorTypes, writeFilter } = useFiltersQuery(ref(columns), ref(columnsType))

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

    const items = ref<(string | number)[]>([])

    if (initialFilter && initialFilter.querySign === '@' && initialFilter.value) {
      if (Array.isArray(initialFilter.value) || initialFilter.value.includes(',')) {
        items.value = Array.isArray(initialFilter.value)
          ? initialFilter.value
          : initialFilter.value
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0)
      } else {
        items.value = [initialFilter.value]
      }
    }

    let initialValue = ref<string | number | undefined>(undefined)
    const operator = detectInitialOperator()
    const comp = comparatorTypes.value.find((comp) => comp.value === operator)

    if (comp?.type.includes('date') && initialFilter.value) {
      const dateValue = dayjs(initialFilter.value).format('YYYY-MM-DDTHH:mm')
      initialValue.value = dateValue
    } else {
      initialValue.value = stripPrefixSuffix(initialFilter?.value) || undefined
    }

    const fieldType = ref<string>()
    const filter = ref<Filter>({
      operator,
      key: initialFilter?.field?.replace('[]', '') || undefined,
      value: initialValue.value,

      min: '',
      max: '',

      items: items.value,
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
    comparator(): { label: string; value: string; prefix?: string; suffix?: string; multiplefields?: boolean; type?: string[] } | undefined {
      return this.comparatorTypes.find((comp) => comp.value === this.filter.operator)
    },
    searchInputType(): string {
      if (!this.fieldType) {
        return this.comparator?.type ? this.comparator.type[0] : 'text'
      }

      return this.fieldType || 'text'
    },
    availableComparators(): { label: string; value: string; prefix?: string; suffix?: string; multiplefields?: boolean }[] {
      if (!this.columnExists(this.filter.key || '') && !this.fieldType) {
        return this.comparatorTypes || []
      }

      return this.comparatorTypes.filter((comparator) => {
        return comparator.type.includes(this.fieldType!)
      })
    },
    optionsMapping(): { label: string; value: string }[] {
      const mapping: { label: string; value: string }[] = []

      this.columnsType.forEach((col) => {
        if (col.name === this.filter.key && col.valueMapping) {
          Object.entries(col.valueMapping).forEach(([key, val]) => {
            mapping.push({ label: val + ' (' + key + ')', value: key })
          })
        }
      })

      return mapping
    },
  },
  methods: {
    columnExists(field: string) {
      return this.columns.find((col) => col.name === field)
    },
    mapAssign(col: { name: string; label?: string }) {
      return { name: col.name, label: col.label || col.name }
    },
    createValue(val: string, done: (newVal: string, mode: 'toggle' | 'add-unique' | 'add') => void) {
      if (val.length > 0) {
        if (this.filterOptions.find((opt) => opt.label === val)) {
          // If the value already exists in options, select it
          const existing = this.filterOptions.find((opt) => opt.label === val)!
          done(existing.name, 'toggle')
        } else {
          // Otherwise, add it to options and select it
          const newOption = { name: val, label: val }
          this.filterOptions.push(newOption)
          done(val, 'add-unique')
        }
      }
    },
    filterFn(val, update) {
      update(() => {
        if (val === '') {
          this.filterOptions = this.columns.map(this.mapAssign)
        } else {
          const needle = val.toLowerCase()
          this.filterOptions = this.columns.map(this.mapAssign).filter((v) => v.label.toLowerCase().indexOf(needle) > -1)
        }
      })
    },
    triggerEnter() {
      ;(this.$refs.field as { focus: () => void }).focus()
      this.$nextTick(() => {
        const input = (this.$refs.field as { $el: HTMLElement }).$el.querySelector('input')
        if (input) {
          input.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              bubbles: true,
            }),
          )
        }
      })
    },
    async copy(text: string) {
      try {
        await copyToClipboard(text)
        this.$q.notify({
          message: 'Champ copié dans le presse-papier',
          color: 'positive',
          icon: 'mdi-clipboard-check',
        })
      } catch (e) {
        console.warn('copyToClipboard failed', e)
        this.$q.notify({
          message: 'Échec de la copie dans le presse-papier',
          color: 'negative',
          icon: 'mdi-close-circle',
        })
      }
    },
  },
  mounted() {
    this.filterOptions = this.columns.map(this.mapAssign)
    this.fieldType = this.columnsType.find((col) => col.name === this.filter.key)?.type
  },
})
</script>
