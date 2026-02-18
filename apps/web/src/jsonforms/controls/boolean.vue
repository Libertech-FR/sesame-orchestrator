<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    v-model:is-hovered="isHovered"

    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  )
    q-field.q-custom(
      v-bind="quasarProps('q-field')"

      @focus="handleFocus"
      @blur="handleBlur"

      :id="control.key"
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
          @icon-click="onAddonIconClick"
        )
      template(#prepend)
        field-addons(
          v-if="appliedOptions?.addons?.prepend && appliedOptions.addons.prepend.length"
          position="prepend"
          :items="appliedOptions.addons.prepend"
          :control-id="control.id"
          @icon-click="onAddonIconClick"
        )
      q-checkbox.non-selectable(
        v-bind="quasarProps('q-checkbox')"
        @update:model-value="onChange"

        :id="control.key + '_checkbox'"
        :model-value="modelValue"
        :label="controlWrapper.label"
        :disable="disable"
        :error="control.errors !== ''"
        :error-message="control.errors"
      )
      template(#append)
        field-addons(
          v-if="appliedOptions?.addons?.append && appliedOptions.addons.append.length"
          position="append"
          :items="appliedOptions.addons.append"
          :control-id="control.id"
          @icon-click="onAddonIconClick"
        )
      template(#after)
        field-addons(
          v-if="appliedOptions?.addons?.after && appliedOptions.addons.after.length"
          position="after"
          :items="appliedOptions.addons.after"
          :control-id="control.id"
          @icon-click="onAddonIconClick"
        )
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { ControlWrapper, FieldAddons } from '../common'
import { useBooleanControl } from '../composables'
import { QCheckbox, QField } from 'quasar'

/**
 * BooleanControlRenderer Component
 *
 * A Vue 3 component that renders JSONForms boolean controls using Quasar's q-checkbox component.
 * This renderer provides an interactive checkbox input for boolean data types within forms,
 * enabling users to toggle true/false values with a clear visual representation.
 *
 * Features:
 *  - Renders boolean values as Quasar checkboxes
 *  - Supports validation with error display
 *  - Provides focus and blur event handling
 *  - Integrates with ControlWrapper for consistent styling
 *  - Handles disabled state based on control configuration
 *  - Displays hints and descriptions for user guidance
 *
 * Usage:
 *  This component is automatically selected by JSONForms when encountering boolean schema properties.
 *  It should not be used directly but rather through the JSONForms rendering system.
 *
 * Example JSON Schema:
 *  {
 *    type: "boolean",
 *    title: "Accept Terms",
 *    description: "Please accept the terms and conditions"
 *  }
 */
const controlRenderer = defineComponent({
  name: 'BooleanControl',
  components: {
    ControlWrapper,
    QField,
    QCheckbox,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },

  /**
   * Setup function that initializes the boolean control renderer with JSONForms integration
   *
   * @param props - Renderer properties containing control element configuration
   * @returns Combined functionality from useQuasarControl and useJsonFormsControl hooks
   */
  setup(props: RendererProps<ControlElement>, { emit }) {
    const jsonFormsControl = useJsonFormsControl(props)
    const api = useBooleanControl({
      jsonFormsControl,
    })

    const onAddonIconClick = (payload: unknown) => {
      emit('addon-icon-click', payload)
    }

    return {
      ...api,
      onAddonIconClick,
    }
  },
})

export default controlRenderer
</script>

<style lang="scss">
.q-custom {
  .q-field__control {
    color: inherit;
  }
}
</style>
