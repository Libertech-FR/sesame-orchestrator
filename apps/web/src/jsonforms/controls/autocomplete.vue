<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    v-model:is-hovered="isHovered"

    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  )
    q-select(
      v-bind="quasarProps('q-select')"
      @update:model-value="onChange"
      :model-value="modelValue"

      @filter="onFilter"
      @focus="isFocused = true"
      @blur="isFocused = false"

      :id="inputId"
      :label="computedLabel"
      :class="styles.control.input"
      :disable="!control.enabled && !isReadonly"
      :readonly="isReadonly"
      :required="control.required"
      :placeholder="appliedOptions.placeholder"
      :hide-bottom-space="!!control.description"
      :options="selectOptions"
      :option-value="optionValueKey"
      :option-label="optionLabelKey"
      :option-disable="optionDisableKey"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :input-debounce="300"

      use-input
      use-chips
      hide-dropdown-icon
      map-options
      emit-value
      stack-label
      options-dense
      outlined
      dense
    )
      template(#before)
        field-addons(
          v-if="appliedOptions?.addons?.before && appliedOptions.addons.before.length"
          position="before"
          :items="appliedOptions.addons.before"
          :control-id="control.id"
        )
      template(#prepend)
        field-addons(
          v-if="appliedOptions?.addons?.prepend && appliedOptions.addons.prepend.length"
          position="prepend"
          :items="appliedOptions.addons.prepend"
          :control-id="control.id"
        )
      template(#append)
        field-addons(
          v-if="appliedOptions?.addons?.append && appliedOptions.addons.append.length"
          position="append"
          :items="appliedOptions.addons.append"
          :control-id="control.id"
        )
      template(#after)
        field-addons(
          v-if="appliedOptions?.addons?.after && appliedOptions.addons.after.length"
          position="after"
          :items="appliedOptions.addons.after"
          :control-id="control.id"
        )
      template(#no-option="{ inputValue }")
        q-item(v-show='inputValue.length >= minLength' dense)
          q-item-section
            q-item-label Aucun résultat
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { rendererProps, type RendererProps, useJsonFormsEnumControl } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { determineClearValue } from '../utils'
import { useAutocompleteControl } from '../composables'
import { QItem, QItemLabel, QItemSection, QSelect } from 'quasar'

const controlRenderer = defineComponent({
  name: 'AutocompleteControl',
  components: {
    ControlWrapper,
    QSelect,
    QItem,
    QItemSection,
    QItemLabel,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsEnumControl(props)
    const clearValue = determineClearValue(undefined)
    const api = useAutocompleteControl({
      jsonFormsControl,
      clearValue,
    })

    return api
  },
})

export default controlRenderer
</script>
