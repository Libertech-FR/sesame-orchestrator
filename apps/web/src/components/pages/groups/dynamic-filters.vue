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
    sesame-core-filter-groups.q-py-xs.full-width(
      :model-value='groups'
      @update:model-value='emitGroups'
      :columns='columns'
      :columns-type='columnsType'
      :default-filter-field-paths='DEFAULT_IDENTITY_FILTER_FIELD_PATHS'
      custom-filter-fields-storage-key='identities'
      :readonly='readonly'
    )
      template(#append)
        q-btn(v-if='!readonly' color='secondary' icon='mdi-filter-variant-plus' size='sm' flat dense round)
          q-tooltip.text-body2 Ajouter un filtre (combiné par ET, cliquer sur « et » pour passer en OU)
          q-popup-proxy(anchor='bottom left' self='top middle' transition-show='scale' transition-hide='scale')
            sesame-core-edit-filters(
              title='Ajouter un filtre'
              :columns='columns'
              :columns-type='columnsType'
              :default-filter-field-paths='DEFAULT_IDENTITY_FILTER_FIELD_PATHS'
              custom-filter-fields-storage-key='identities'
              local
              @submit='add'
            )
  template(#after)
    q-chip(v-if='count' :color='previewTotal === null ? "grey" : "primary"' text-color='white' icon='mdi-account-multiple' dense)
      q-spinner(v-if='previewLoading' size='xs')
      span(v-else) {{ previewTotal ?? '?' }}
      q-tooltip.text-body2 Nombre d'identités sélectionnées par le filtre
</template>

<script lang="ts">
import type { PropType } from 'vue'
import { countFilterConditions, filterGroupsToPayload, payloadToFilterGroups, writeFilterInGroups } from '~/composables/useFiltersQuery'
import type { FilterGroup, FilterGroupsPayload, WritableFilter } from '~/composables/useFiltersQuery'
import { DEFAULT_IDENTITY_FILTER_FIELD_PATHS } from '~/composables/useFilterFieldOptions'

export type DynamicGroupFilters = FilterGroupsPayload

/**
 * Éditeur du filtre d'un groupe dynamique.
 * Le modèle est au format attendu par l'API, sans l'enveloppe `filters[...]` utilisée dans les query de route :
 * `{ "<signe><champ>": valeur }` (conditions ET) ou une liste de tels objets combinés par OU.
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
    groups(): FilterGroup[] {
      return payloadToFilterGroups(this.modelValue)
    },
    count(): number {
      return countFilterConditions(this.groups)
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
    add(filter: WritableFilter) {
      const groups = writeFilterInGroups(this.groups, filter)
      if (groups) this.emitGroups(groups)
    },
    emitGroups(groups: FilterGroup[]) {
      this.$emit('update:modelValue', filterGroupsToPayload(groups))
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
