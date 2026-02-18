<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-input(
      @update:model-value="onChange"
      @focus="isFocused = true"
      @blur="isFocused = false"

      :model-value="modelValue"
      :id="control.id + '-input'"
      :label="computedLabel"
      :class="styles.control.input"
      clear-icon="mdi-close"
      :disable="!control.enabled && !isReadonly"
      :placeholder="appliedOptions.placeholder"
      :readonly="isReadonly"
      :autofocus="appliedOptions.focus"
      :hint="control.description"
      :required="control.required"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :hide-bottom-space="!!control.description"
      :maxlength="maxLength"
      :counter="counter"
      :clearable="isClearable"
      :debounce="100"
      outlined
      stack-label
      dense

      v-bind="quasarProps('q-input')"
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
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { determineClearValue } from '../utils'
import { QInput } from 'quasar'
import { useStringControl } from '../composables'

const controlRenderer = defineComponent({
  name: 'InputControlRenderer',
  components: {
    ControlWrapper,
    QInput,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue(undefined)
    const api = useStringControl({
      jsonFormsControl,
      clearValue,
      debounceWait: 100,
    })

    return api
  },
})

export default controlRenderer
</script>
