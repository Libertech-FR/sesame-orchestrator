<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-field.q-custom(
      v-bind="quasarProps('q-field')"
      @focus="handleFocus"
      @blur="handleBlur"
      :id="control.key"
      :label="computedLabel"
      :class="styles.control.input"
      :hint="control.description"
      :required="control.required"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :disable="disable"
      borderless
      hide-bottom-space
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
        q-option-group.q-py-sm(
          v-bind="quasarProps('q-option-group')"
          type="radio"
          @update:model-value="onChange"
          @focus="isFocused = true"
          @blur="isFocused = false"
          :id="control.id + '_q-option-group'"
          :model-value="modelValue"
          :class="styles.control.input"
          :disable="disable"
          :options="control.options"
          :inline="appliedOptions?.inline !== false"
          :size="appliedOptions?.size ?? 'sm'"
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
import { rendererProps, type RendererProps, useJsonFormsEnumControl } from '@jsonforms/vue'
import { QField, QOptionGroup } from 'quasar'
import { defineComponent } from 'vue'
import { determineClearValue } from '../utils'
import { ControlWrapper, FieldAddons } from '../common'
import { useRadioGroupControl } from '../composables'

const controlRenderer = defineComponent({
  name: 'RadioGroupControlRenderer',
  components: {
    ControlWrapper,
    QField,
    QOptionGroup,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsEnumControl(props)
    const clearValue = determineClearValue(undefined)
    const api = useRadioGroupControl({
      jsonFormsControl,
      clearValue,
    })

    return api
  },
})

export default controlRenderer
</script>

<style lang="scss">
.q-custom {
  .q-field__control {
    //color: inherit;
  }
}
</style>
