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
            json-forms(
              :data="editedRow"
              :schema="dialogSchema"
              :uischema="dialogUiSchema"
              :renderers="dialogRenderers"
              :readonly="!canEdit"
              @change="onDialogChange"
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
import { JsonForms, rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { QBtn, QCard, QCardActions, QCardSection, QDialog, QTable, QTd } from 'quasar'
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
    JsonForms,
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

    const dialogSchema = computed(() => api.itemSchema.value)

    const dialogUiSchema = computed(() => {
      const elements = api.fields.value.map((field: ArrayTableField) => {
        if (field.uiElement) {
          return field.uiElement
        }

        return {
          type: 'Control',
          label: field.label,
          scope: `#/properties/${field.key}`,
          options: field.uiOptions || {},
        }
      })

      return {
        type: 'VerticalLayout',
        elements,
      }
    })

    const dialogRenderers = computed(() => props.renderers || [])

    const onDialogChange = (event: { data?: Record<string, unknown> }) => {
      api.editedRow.value = (event?.data || {}) as Record<string, unknown>
    }

    return {
      ...api,
      canEdit,
      tableRows,
      tableColumns,
      openEditByIndex,
      dialogSchema,
      dialogUiSchema,
      dialogRenderers,
      onDialogChange,
    }
  },
})

export default controlRenderer
</script>
