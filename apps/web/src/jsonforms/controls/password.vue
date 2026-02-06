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

      :type="passwordVisible ? 'text' : 'password'"
      :id="control.id + '-input'"
      :model-value="modelValue"
      :label="computedLabel"
      clear-icon="mdi-close"
      :class="styles.control.input"
      :disable="!control.enabled && !isReadonly"
      :placeholder="appliedOptions.placeholder"
      :autofocus="appliedOptions.focus"
      :required="control.required"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :hide-bottom-space="!!control.description"
      :error-message="control.errors"
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
        q-icon.cursor-pointer(
          :name="passwordVisible ? 'mdi-eye-off' : 'mdi-eye'"
          @click="passwordVisible = !passwordVisible"
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
import { type ControlElement, type JsonFormsRendererRegistryEntry, rankWith, isStringControl, and, formatIs } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { determineClearValue } from '../utils'
import { QIcon, QInput } from 'quasar'
import { usePasswordControl } from '../composables'

const controlRenderer = defineComponent({
  name: 'PasswordControlRenderer',
  components: {
    ControlWrapper,
    QInput,
    QIcon,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue(undefined)
    const api = usePasswordControl({
      jsonFormsControl,
      clearValue,
      debounceWait: 100,
    })

    return api
  },
})

export default controlRenderer

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  // prettier-ignore
  tester: rankWith(2,
    and(
      isStringControl,
      formatIs('password'),
    ),
  ), // Matches schema properties with format "password"
}
</script>
