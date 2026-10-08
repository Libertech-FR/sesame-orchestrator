<template lang="pug">
q-field(
  label='Filtre de sélection des membres'
  :error='!count'
  error-message='Ajoutez au moins un filtre'
  stack-label
  outlined
  dense
)
  template(#control)
    .flex.items-center.q-gutter-xs.q-py-xs.full-width
      template(v-for='(filter, key, i) in parsedFilters' :key='key')
        q-chip(
          :removable='!readonly'
          :clickable='!readonly'
          @remove='remove(filter)'
          :color='$q.dark.isActive ? "grey-9" : "grey-3"'
          dense
        )
          | {{ filter.label }}
          q-separator.q-mx-xs(vertical)
          | {{ filter.comparator }}
          q-separator.q-mx-xs(vertical)
          | "{{ filter.search }}"
          q-popup-proxy(v-if='!readonly' anchor='bottom left' self='top middle' transition-show='scale' transition-hide='scale')
            sesame-core-edit-filters(
              title='Modifier le filtre'
              :initial-filter='filter'
              :columns='columns'
              :columns-type='columnsType'
              :default-filter-field-paths='DEFAULT_IDENTITY_FILTER_FIELD_PATHS'
              custom-filter-fields-storage-key='identities'
              local
              @submit='write'
            )
        span.content-center.text-caption(v-if='i < count - 1') et
      q-btn(v-if='!readonly' color='secondary' icon='mdi-filter-variant-plus' size='sm' flat dense round)
        q-tooltip.text-body2 Ajouter un filtre
        q-popup-proxy(anchor='bottom left' self='top middle' transition-show='scale' transition-hide='scale')
          sesame-core-edit-filters(
            title='Ajouter un filtre'
            :columns='columns'
            :columns-type='columnsType'
            :default-filter-field-paths='DEFAULT_IDENTITY_FILTER_FIELD_PATHS'
            custom-filter-fields-storage-key='identities'
            local
            @submit='write'
          )
  template(#after)
    q-chip(v-if='count' :color='previewTotal === null ? "grey" : "primary"' text-color='white' icon='mdi-account-multiple' dense)
      q-spinner(v-if='previewLoading' size='xs')
      span(v-else) {{ previewTotal ?? '?' }}
      q-tooltip.text-body2 Nombre d'identités sélectionnées par le filtre
</template>

<script lang="ts">
import type { PropType } from 'vue'
import { applyFilter, deleteFilter, parseFilters, FILTER_PREFIX, FILTER_SUFFIX } from '~/composables/useFiltersQuery'
import type { FiltersRecord, WritableFilter } from '~/composables/useFiltersQuery'
import { DEFAULT_IDENTITY_FILTER_FIELD_PATHS } from '~/composables/useFilterFieldOptions'

export type DynamicGroupFilters = Record<string, string | string[]>

/**
 * Éditeur du filtre d'un groupe dynamique.
 * Le modèle est au format attendu par l'API (`{ "<signe><champ>": valeur }`), sans l'enveloppe `filters[...]`
 * utilisée dans les query de route par les composants de filtre.
 */
export default defineNuxtComponent({
  name: 'PagesGroupsDynamicFiltersComponent',
  props: {
    modelValue: {
      type: Object as PropType<DynamicGroupFilters | null>,
      default: null,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const { columns, columnsType } = useColumnsIdentites()
    const { handleErrorReq } = useErrorHandling()

    return {
      columns,
      columnsType,
      handleErrorReq,
      DEFAULT_IDENTITY_FILTER_FIELD_PATHS,
    }
  },
  data() {
    return {
      previewTotal: null as number | null,
      previewLoading: false,
      previewTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },
  computed: {
    queryFilters(): FiltersRecord {
      return Object.fromEntries(Object.entries(this.modelValue || {}).map(([key, value]) => [`${FILTER_PREFIX}${key}${FILTER_SUFFIX}`, value]))
    },
    parsedFilters() {
      // les refs du setup sont déballées dans `this`, parseFilters attend des refs
      return parseFilters(this.queryFilters, ref(this.columns), ref(this.columnsType))
    },
    count(): number {
      return Object.keys(this.modelValue || {}).length
    },
  },
  watch: {
    modelValue: {
      handler() {
        this.schedulePreview()
      },
      deep: true,
      immediate: true,
    },
  },
  beforeUnmount() {
    if (this.previewTimer) clearTimeout(this.previewTimer)
  },
  methods: {
    write(filter: WritableFilter) {
      const query = applyFilter(this.queryFilters, filter)
      if (query) this.emitQuery(query)
    },
    remove(filter: { field: string; querySign: string }) {
      this.emitQuery(deleteFilter(this.queryFilters, filter))
    },
    emitQuery(query: FiltersRecord) {
      const filters: DynamicGroupFilters = {}
      for (const [key, value] of Object.entries(query)) {
        if (!key.startsWith(FILTER_PREFIX) || !key.endsWith(FILTER_SUFFIX) || value === undefined || value === null) continue
        filters[key.slice(FILTER_PREFIX.length, -FILTER_SUFFIX.length)] = value as string | string[]
      }
      this.$emit('update:modelValue', filters)
    },
    schedulePreview() {
      if (this.previewTimer) clearTimeout(this.previewTimer)
      if (!this.count) {
        this.previewTotal = null
        return
      }
      this.previewTimer = setTimeout(() => this.fetchPreview(), 300)
    },
    async fetchPreview() {
      this.previewLoading = true
      try {
        const res = await this.$http.post('/management/groups/preview-members', {
          body: { filters: this.modelValue },
        })
        this.previewTotal = res?._data?.data?.total ?? null
      } catch (error: unknown) {
        this.previewTotal = null
        this.handleErrorReq({ error, message: 'Filtre invalide' })
      } finally {
        this.previewLoading = false
      }
    },
  },
})
</script>
