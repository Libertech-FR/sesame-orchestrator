<template lang="pug">
.flex.items-center.q-gutter-xs
  template(v-for='(group, g) in parsedGroups' :key='g')
    .filter-group.flex.items-center(:class='{ "filter-group--bordered": parsedGroups.length > 1 }')
      template(v-for='(filter, i) in group' :key='filter.key')
        q-chip(
          :class='{ "text-black": !isRecognizedFilterField(filter.field) }'
          :color='getFilterColor(filter)'
          :removable='!readonly'
          :clickable='!readonly'
          @remove='remove(g, filter)'
          dense
        )
          span.text-negative.text-weight-bold.q-mr-xs(v-if='filter.negated') NON
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
              :default-filter-field-paths='defaultFilterFieldPaths'
              :custom-filter-fields-storage-key='customFilterFieldsStorageKey'
              local
              @submit='write($event, g)'
            )
          q-tooltip.text-body2(v-if='!readonly' :class='getTooltipColor(filter)' anchor='top middle' self='bottom middle')
            span(v-if='!isRecognizedFilterField(filter.field)')
              | Cliquer pour modifier le filtre&nbsp;
              small (Le champ "{{ filter.field }}" n'existe pas ou n'est pas reconnu)
            span(v-else) Cliquer pour modifier le filtre
        template(v-if='i < group.length - 1')
          q-btn.filter-connector(
            v-if='!readonly'
            label='ET'
            color='primary'
            icon-right='mdi-swap-horizontal'
            size='sm'
            unelevated
            rounded
            dense
            @click='toggle(g, i)'
          )
            q-tooltip.text-body2 Cliquer pour combiner par OU
          q-badge.filter-connector(v-else label='ET' color='primary' rounded)
    template(v-if='g < parsedGroups.length - 1')
      q-btn.filter-connector(
        v-if='!readonly'
        label='OU'
        color='deep-orange'
        icon-right='mdi-swap-horizontal'
        size='sm'
        unelevated
        rounded
        dense
        @click='toggle(g, group.length - 1)'
      )
        q-tooltip.text-body2 Cliquer pour combiner par ET
      q-badge.filter-connector(v-else label='OU' color='deep-orange' rounded)
  slot(name='append')
</template>

<script lang="ts">
import type { PropType } from 'vue'
import type { QTableProps } from 'quasar'
import { parseFilterGroup, deleteFilterFromGroup, toggleFilterConnector, writeFilterInGroups } from '~/composables/useFiltersQuery'
import type { ColumnType, FilterGroup, ParsedFilter, WritableFilter } from '~/composables/useFiltersQuery'

/**
 * Affichage/édition de groupes de conditions : les conditions d'un groupe sont combinées par ET,
 * les groupes entre eux par OU, soit « A et B ou C » = (A ET B) OU C.
 * Un clic sur un connecteur bascule entre ET et OU.
 */
export default defineNuxtComponent({
  name: 'CoreFilterGroupsComponent',
  props: {
    modelValue: {
      type: Array as PropType<FilterGroup[]>,
      default: () => [],
    },
    columns: {
      type: Array as PropType<QTableProps['columns'] & { type: string }[]>,
      default: () => [],
    },
    columnsType: {
      type: Array as PropType<ColumnType[]>,
      default: () => [],
    },
    defaultFilterFieldPaths: {
      type: Array as PropType<readonly string[]>,
      default: () => [],
    },
    customFilterFieldsStorageKey: {
      type: String,
      default: undefined,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  computed: {
    parsedGroups(): ParsedFilter[][] {
      // parseFilterGroup attend des refs, déballées dans `this`
      const columns = ref(this.columns)
      const columnsType = ref(this.columnsType)
      return this.modelValue.map((group) => parseFilterGroup(group, columns, columnsType))
    },
  },
  methods: {
    /**
     * Écrit une condition dans le groupe d'index donné (par défaut le dernier : la condition est ajoutée par ET)
     */
    write(filter: WritableFilter, index?: number) {
      const groups = writeFilterInGroups(this.modelValue, filter, index)
      if (groups) this.$emit('update:modelValue', groups)
    },
    remove(index: number, filter: ParsedFilter) {
      const groups = [...this.modelValue]
      groups[index] = deleteFilterFromGroup(groups[index], filter)
      this.$emit(
        'update:modelValue',
        groups.filter((group) => Object.keys(group).length > 0),
      )
    },
    toggle(index: number, position: number) {
      const groups = toggleFilterConnector(this.modelValue, index, position)
      if (!groups) {
        this.$q.notify({
          message: 'Impossible de combiner par ET deux conditions sur le même champ',
          color: 'warning',
          textColor: 'black',
          icon: 'mdi-alert',
        })
        return
      }
      this.$emit('update:modelValue', groups)
    },
    isRecognizedFilterField(field: string) {
      return isRecognizedFilterField(field, {
        columns: this.columns,
        columnsType: this.columnsType,
        defaultFilterFieldPaths: this.defaultFilterFieldPaths,
      })
    },
    getFilterColor(filter: ParsedFilter) {
      if (this.isRecognizedFilterField(filter.field)) {
        return this.$q.dark.isActive ? 'grey-9' : 'grey-3'
      }

      return this.$q.dark.isActive ? 'amber-9' : 'amber-3'
    },
    getTooltipColor(filter: ParsedFilter) {
      if (this.isRecognizedFilterField(filter.field)) return ''

      return [this.$q.dark.isActive ? 'bg-amber-9' : 'bg-amber-3', 'text-black'].join(' ')
    },
  },
})
</script>

<style lang="scss" scoped>
.filter-group--bordered {
  // deep-orange de la palette Quasar, couleur du connecteur OU
  border: 2px dashed #ff5722;
  border-radius: 16px;
  padding: 0 2px;
}

.filter-connector {
  min-height: 0;
  padding: 1px 8px;
  margin: 0 4px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1.5;
}
</style>
