<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-select(
      @update:model-value="onChange"
      @focus="isFocused = true"
      @blur="isFocused = false"
      @new-value="createValue"
      :id="control.id"
      :model-value="control.data || null"
      :label="computedLabel"
      :class="styles.control.input"
      clear-icon="mdi-close"
      :disable="!control.enabled && !isReadonly"
      :readonly="isReadonly"
      :required="control.required"
      :placeholder="appliedOptions.placeholder"
      :hide-bottom-space="!!control.description"
      :use-input="!suggestions || suggestions.length === 0"
      :options="options"
      :hide-dropdown-icon="!suggestions || suggestions.length === 0"
      :option-value="optionValueKey"
      :option-label="optionLabelKey"
      :option-disable="optionDisableKey"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :multiple="isArrayControl"
      :clearable="isClearable"
      :debounce="100"
      :emit-value="emitValue"
      map-options
      new-value-mode="add-unique"
      outlined
      use-chips
      options-dense
      stack-label
      dense
      v-bind="quasarProps('q-select')"
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
    template(#no-option)
      q-item
        q-item-section
          q-item-label Aucun résultat
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { rendererProps, type RendererProps, useJsonFormsEnumControl } from '@jsonforms/vue'
import { QItem, QItemLabel, QItemSection, QSelect } from 'quasar'
import { defineComponent } from 'vue'
import { ControlWrapper, FieldAddons } from '../common'
import { useEnumSuggestionControl } from '../composables'
import { determineClearValue } from '../utils'

const controlRenderer = defineComponent({
  name: 'EnumAndSuggestionControlRenderer',
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
    const api = useEnumSuggestionControl({
      jsonFormsControl,
      clearValue,
    })

    return api
  },
})

export default controlRenderer
</script>
