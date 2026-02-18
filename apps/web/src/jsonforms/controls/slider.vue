<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-field(
      v-bind="quasarProps('q-field')"
      @update:model-value="onChange"
      :id="control.id + '-input'"
      :model-value="modelValue"
      :label="computedLabel"
      :class="styles.control.input"
      :disable="!control.enabled && !isReadonly"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :hide-bottom-space="!!control.description"
      :debounce="100"
      outlined
      stack-label
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
      template(#control)
        q-slider(
          v-bind="quasarProps('q-slider')"
          @update:model-value="onChange"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :model-value="modelValue"
          :min="min"
          :max="max"
          :step="step"
          label
          label-always
          dense
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
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { determineClearValue } from '../utils'
import { QField, QSlider } from 'quasar'
import { useSliderControl } from '../composables'

const controlRenderer = defineComponent({
  name: 'slider-control-renderer',
  components: {
    ControlWrapper,
    QField,
    QSlider,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue(0) as number
    const api = useSliderControl({
      jsonFormsControl,
      clearValue,
    })

    return api
  },
})

export default controlRenderer
</script>
