<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    .q-mb-sm
      q-btn(
        label="Ajouter"
        icon="mdi-plus"
        color="primary"
        unelevated
        dense
        :disable="!canEdit"
        @click="openCreateDialog"
      )

    q-table(
      flat
      bordered
      dense
      :rows="tableRows"
      :columns="tableColumns"
      row-key="__rowIndex"
      hide-bottom
      :rows-per-page-options="[0]"
    )
      template(#body-cell="props")
        q-td(:props="props")
          template(v-if="props.col.name === '__actions'")
            .row.justify-end.q-gutter-xs
              q-btn(
                icon="mdi-pencil"
                flat
                dense
                round
                :disable="!canEdit"
                @click="openEditByIndex(props.row.__rowIndex)"
              )
              q-btn(
                icon="mdi-delete"
                color="negative"
                flat
                dense
                round
                :disable="!canEdit"
                @click="removeRow(props.row.__rowIndex)"
              )
          template(v-else)
            span {{ formatCellValue(props.value) }}
      template(#no-data)
        .text-grey-7 Aucun élément

    q-dialog(v-model="dialogOpen" persistent)
      q-card(style="min-width: 560px; max-width: 90vw;")
        q-card-section
          .text-h6 {{ editedIndex === null ? 'Ajouter un élément' : "Modifier l'élément" }}

        q-card-section
          .column.q-gutter-sm
            div(v-for="field in fields" :key="field.key")
              q-select(
                v-if="field.type === 'array' && isPrimitiveArrayField(field)"
                :model-value="editedRow[field.key] || []"
                :label="field.label"
                :options="getFieldOptions(field)"
                multiple
                use-input
                use-chips
                hide-dropdown-icon
                new-value-mode="add-unique"
                outlined
                dense
                :placeholder="field.uiOptions?.placeholder"
                :readonly="!canEdit"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                @update:model-value="updateField(field.key, $event)"
                @new-value="(value, done) => addArrayItem(field.key, value, done)"
                @filter="(value, update) => onFieldFilter(field, value, update)"
              )
              q-select(
                v-else-if="field.type === 'string' && shouldUseEnumSuggestion(field)"
                :model-value="editedRow[field.key] || null"
                :label="field.label"
                :options="getFieldOptions(field)"
                use-input
                hide-dropdown-icon
                new-value-mode="add-unique"
                outlined
                dense
                :placeholder="field.uiOptions?.placeholder"
                :readonly="!canEdit"
                option-label="label"
                option-value="value"
                emit-value
                map-options
                @update:model-value="updateField(field.key, $event)"
                @new-value="(value, done) => addSingleValue(field.key, value, done)"
                @filter="(value, update) => onFieldFilter(field, value, update)"
              )
              q-toggle(
                v-else-if="field.type === 'boolean'"
                :model-value="Boolean(editedRow[field.key])"
                :label="field.label"
                :disable="!canEdit"
                @update:model-value="updateField(field.key, $event)"
              )
              q-input(
                v-else
                :model-value="editedRow[field.key]"
                :type="field.type === 'number' || field.type === 'integer' ? 'number' : 'text'"
                :label="field.label"
                outlined
                dense
                :placeholder="field.uiOptions?.placeholder"
                :readonly="!canEdit"
                @update:model-value="updateField(field.key, castScalarValue(field, $event))"
              )

        q-card-actions(align="right")
          q-btn(flat label="Annuler" @click="closeDialog")
          q-btn(
            color="primary"
            unelevated
            label="Enregistrer"
            :disable="!canEdit"
            @click="saveRow"
          )
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent, computed } from 'vue'
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { QBtn, QCard, QCardActions, QCardSection, QDialog, QInput, QSelect, QTable, QTd, QToggle } from 'quasar'
import { ControlWrapper } from '../common'
import { determineClearValue } from '../utils'
import { useArrayTableControl, type ArrayTableField } from '../composables'

const controlRenderer = defineComponent({
  name: 'ArrayTableLayoutRenderer',
  components: {
    ControlWrapper,
    QBtn,
    QTable,
    QTd,
    QDialog,
    QCard,
    QCardSection,
    QCardActions,
    QInput,
    QSelect,
    QToggle,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue([])
    const api = useArrayTableControl({
      jsonFormsControl,
      clearValue,
    })

    const canEdit = computed(() => api.control.value.enabled && !api.isReadonly.value)

    const tableRows = computed(() => {
      return api.rows.value.map((row, index) => ({
        ...row,
        __rowIndex: index,
      }))
    })

    const tableColumns = computed(() => {
      const dynamicColumns = api.fields.value.map((field) => ({
        name: field.key,
        label: field.label,
        field: (row: Record<string, any>) => row[field.key],
        align: 'left',
      }))

      return [
        ...dynamicColumns,
        {
          name: '__actions',
          label: 'Actions',
          field: () => '',
          align: 'right',
        },
      ]
    })

    const openEditByIndex = (index: number) => {
      const row = api.rows.value[index]
      api.openEditDialog(row, index)
    }

    const updateField = (key: string, value: unknown) => {
      api.editedRow.value = {
        ...api.editedRow.value,
        [key]: value,
      }
    }

    const isPrimitiveArrayField = (field: ArrayTableField) => {
      return field.itemType === 'string' || field.itemType === 'number' || field.itemType === 'integer'
    }

    const shouldUseEnumSuggestion = (field: ArrayTableField) => {
      return Boolean(field.api?.url) || Array.isArray(field.suggestions)
    }

    const onFieldFilter = (field: ArrayTableField, value: string, update: (callbackFn: () => void) => void) => {
      update(async () => {
        if (!field.api?.url) return
        await api.fetchFieldOptions(field, value)
      })
    }

    const addArrayItem = (key: string, value: unknown, done: () => void) => {
      const current = Array.isArray(api.editedRow.value[key]) ? api.editedRow.value[key] : []
      const nextValue = typeof value === 'string' ? value.trim() : value
      if (nextValue !== '' && !current.includes(nextValue)) {
        updateField(key, [...current, nextValue])
      }
      done()
    }

    const addSingleValue = (key: string, value: unknown, done: () => void) => {
      const nextValue = typeof value === 'string' ? value.trim() : value
      if (nextValue !== '') {
        updateField(key, nextValue)
      }
      done()
    }

    const castScalarValue = (field: ArrayTableField, value: unknown) => {
      if (field.type !== 'number' && field.type !== 'integer') return value
      if (value === '' || value === null || value === undefined) return null
      const parsed = Number(value)
      return Number.isNaN(parsed) ? null : parsed
    }

    return {
      ...api,
      canEdit,
      tableRows,
      tableColumns,
      openEditByIndex,
      updateField,
      isPrimitiveArrayField,
      shouldUseEnumSuggestion,
      onFieldFilter,
      addArrayItem,
      addSingleValue,
      castScalarValue,
    }
  },
})

export default controlRenderer
</script>
