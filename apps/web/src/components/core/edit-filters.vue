<template lang="pug">
q-card.transparent(style='min-width: 45vw; max-width: 90vw')
  q-toolbar.bg-secondary.text-white(dense flat style='height: 32px;')
    q-toolbar-title
      span {{ title }}&nbsp;
      small(v-if='isRecognizedFilterField(initialFilter.field || "")')
        i(v-if='initialFilter.label') <{{ initialFilter.label }}>
      q-chip(
        @click='copy(initialFilter.field || "")'
        v-if='initialFilter && initialFilter.field'
        :color='isRecognizedFilterField(initialFilter.field || "") ? ($q.dark.isActive ? "grey-9" : "grey-3") : ($q.dark.isActive ? "amber-9" : "amber-3")'
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
            style='overflow-x: hidden;'
            :class="[!isRecognizedFilterField(scope.opt.name || scope.opt) ? 'text-black' : '']"
            :color="!isRecognizedFilterField(scope.opt.name || scope.opt) ? ($q.dark.isActive ? 'amber-9' : 'amber-3') : ''"
            dense
          )
            template(v-if='isCustomFilterFieldOption(scope.opt)')
              | {{ scope.opt.name || scope.opt }}
            template(v-else)
              | {{ scope.opt.label || scope.opt.name || scope.opt }}
              small.filter-field-path(v-if='scope.opt.name && scope.opt.label !== scope.opt.name') ({{ scope.opt.name }})
        template(v-slot:option="scope")
          q-item(v-bind="scope.itemProps")
            q-item-section
              template(v-if='isCustomFilterFieldOption(scope.opt)')
                q-item-label {{ scope.opt.name }}
              template(v-else)
                q-item-label
                  | {{ scope.opt.label }}
                  small.filter-field-path(v-if='scope.opt.name && scope.opt.label !== scope.opt.name') ({{ scope.opt.name }})
            q-item-section(v-if='isCustomFilterFieldOption(scope.opt) && customFilterFieldsStorageKey' side)
              q-btn(
                icon='mdi-delete-outline'
                flat
                dense
                round
                size='sm'
                color='negative'
                aria-label='Supprimer le champ personnalisé'
                @click.stop='removeCustomFilterFieldOption(scope.opt.name)'
              )
                q-tooltip Supprimer ce champ personnalisé
        template(#no-option="{ inputValue }")
          q-item(clickable @click="triggerEnter")
            q-item-section
              q-item-label
                | Ajouter le filtre personnalisé
                | &nbsp;
                code <{{ inputValue }}>
      q-select.col-1(
        v-if='filter.key && !isRecognizedFilterField(filter.key || "")'
        style='min-width: 120px'
        v-model='fieldType'
        label='Type'
        :options='["text", "number", "date", "boolean", "array"]'
        :readonly='!filter.key || !!isRecognizedFilterField(filter.key || "")'
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
        v-if="!comparator?.multiplefields && optionsMapping.length === 0 && comparator?.querySign !== '?' && comparator?.querySign !== '~'"
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
        v-if="!comparator?.multiplefields && optionsMapping.length > 0 && comparator?.querySign !== '~'"
        v-model='filter.value'
        label='Valeur'
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :type='searchInputType'
        :readonly='!filter.operator'
        :options="optionsMapping"
        @filter="filterFn"
        new-value-mode="add-unique"
        input-debounce="0"
        emit-value
        use-input
        use-chips
        map-options
        dense
        outlined
      )
      q-select.col(
        style='min-width: 300px'
        v-if="comparator?.querySign === '~'"
        v-model='filter.value'
        label='Valeur'
        :prefix="comparator?.prefix"
        :suffix="comparator?.suffix"
        :type='searchInputType'
        :readonly='!filter.operator'
        :options="['true', 'false']"
        emit-value
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
    defaultFilterFieldPaths: {
      type: Array as PropType<readonly string[]>,
      required: false,
      default: () => [],
    },
    customFilterFieldsStorageKey: {
      type: String,
      required: false,
      default: undefined,
    },
  },
  watch: {
    'filter.key': {
      handler() {
        this.fieldType = resolveFilterFieldType(this.filter.key || '', this.columnsType)
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
      allFilterOptions: [] as { name: string; label: string }[],
    }
  },
  setup({ columns, initialFilter, columnsType }) {
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

    if (comp?.type.includes('date') && comp?.querySign !== '~' && initialFilter.value) {
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
      if (!this.isRecognizedFilterField(this.filter.key || '') && !this.fieldType) {
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
    isRecognizedFilterField(field: string) {
      return isRecognizedFilterField(field, {
        columns: this.columns,
        columnsType: this.columnsType,
        defaultFilterFieldPaths: this.defaultFilterFieldPaths,
      })
    },
    isCustomFilterFieldOption(option: { name?: string; label?: string; isCustom?: boolean } | string) {
      if (typeof option === 'string') {
        return this.allFilterOptions.find((item) => item.name === option)?.isCustom === true
      }

      if (option?.isCustom) return true

      const name = option?.name
      if (!name) return false

      return this.allFilterOptions.find((item) => item.name === name)?.isCustom === true
    },
    rebuildFilterOptions() {
      this.allFilterOptions = buildFilterFieldOptions(this.columns, {
        extraDefaultPaths: this.defaultFilterFieldPaths,
        customStorageKey: this.customFilterFieldsStorageKey,
      })
      this.filterOptions = [...this.allFilterOptions]
    },
    removeCustomFilterFieldOption(field: string) {
      if (!this.customFilterFieldsStorageKey || !field) return

      removeCustomFilterField(this.customFilterFieldsStorageKey, field)

      if (this.filter.key === field) {
        this.filter.key = undefined
        this.filter.operator = ''
        this.filter.value = undefined
      }

      this.rebuildFilterOptions()
    },
    createValue(val: string, done: (newVal: string, mode: 'toggle' | 'add-unique' | 'add') => void) {
      if (val.length > 0) {
        const existingByName = this.allFilterOptions.find((opt) => opt.name === val)
        const existingByLabel = this.allFilterOptions.find((opt) => opt.label === val)
        const existing = existingByName || existingByLabel

        if (existing) {
          done(existing.name, 'toggle')
          return
        }

        if (this.customFilterFieldsStorageKey) {
          saveCustomFilterField(this.customFilterFieldsStorageKey, val)
        }

        this.rebuildFilterOptions()
        done(val, 'add-unique')
      }
    },
    filterFn(val, update) {
      update(() => {
        if (val === '') {
          this.filterOptions = [...this.allFilterOptions]
        } else {
          const needle = val.toLowerCase()
          this.filterOptions = this.allFilterOptions.filter(
            (option) => option.label.toLowerCase().includes(needle) || option.name.toLowerCase().includes(needle),
          )
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
    this.rebuildFilterOptions()
    this.fieldType = resolveFilterFieldType(this.filter.key || '', this.columnsType)

    if (!this.fieldType && !this.isRecognizedFilterField(this.filter.key || '') && this.filter.key) {
      this.fieldType = this.comparator?.type ? this.comparator.type[0] : 'text'
    }
  },
})
</script>

<style lang="scss" scoped>
.filter-field-path {
  font-size: 0.75em;
  opacity: 0.72;
}
</style>
