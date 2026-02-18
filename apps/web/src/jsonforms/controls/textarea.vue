<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-input(
      type="textarea"
      v-bind="quasarProps('q-input')"
      @update:model-value="onChange"
      @focus="isFocused = true"
      @blur="isFocused = false"
      clear-icon="mdi-close"
      :id="control.id + '-input'"
      :model-value="modelValue"
      :label="computedLabel"
      :class="styles.control.input"
      :disable="!control.enabled && !isReadonly"
      :placeholder="appliedOptions.placeholder"
      :readonly="isReadonly"
      :autofocus="appliedOptions.focus"
      :hint="control.description"
      :required="control.required"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :maxlength="maxLength"
      :clearable="isClearable"
      :debounce="100"
      :rows="rows"
      :min-rows="minRows"
      :counter="counter"
      stack-label
      outlined
      autogrow
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
import { rendererProps, type RendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { determineClearValue } from '../utils'
import { QInput } from 'quasar'
import { useTextareaControl } from '../composables'

const controlRenderer = defineComponent({
  name: 'StringControlRenderer',
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
    const api = useTextareaControl({
      jsonFormsControl,
      clearValue,
      debounceWait: 100,
    })

    return api
  },
})

export default controlRenderer
</script>
