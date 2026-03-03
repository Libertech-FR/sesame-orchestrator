<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    q-select(
      :model-value="selectedKey"
      :label="computedLabel"
      :options="normalizedOptions"
      :placeholder="appliedOptions.placeholder"
      :disable="!control.enabled && !isReadonly"
      :readonly="isReadonly"
      clear-icon="mdi-close"
      :required="control.required"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :error-message="control.errors"
      :_clearable="isClearable"
      option-label="label"
      option-value="key"
      emit-value
      map-options
      outlined
      stack-label
      dense
      @focus="isFocused = true"
      @blur="isFocused = false"
      @update:model-value="onUpdate"
      v-bind="quasarProps('q-select')"
    )
      template(#before v-if="appliedOptions?.addons?.before && appliedOptions.addons.before.length")
        field-addons(
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
import { rendererProps, useJsonFormsControl, type RendererProps } from '@jsonforms/vue'
import { QSelect } from 'quasar'
import { computed, defineComponent } from 'vue'
import { ControlWrapper, FieldAddons } from '../common'
import { useQuasarControl } from '../utils'

type AclOption = {
  key: string
  label: string
  value: string[]
}

const toUniqueStringArray = (input: unknown): string[] => {
  const asArray = Array.isArray(input) ? input.flat() : []
  const valid = asArray.filter((item): item is string => typeof item === 'string')
  return Array.from(new Set(valid))
}

const sameActionSet = (left: string[], right: string[]): boolean => {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every(item => rightSet.has(item))
}

const controlRenderer = defineComponent({
  name: 'AclControlRenderer',
  components: {
    ControlWrapper,
    QSelect,
    FieldAddons,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const controlApi = useQuasarControl(jsonFormsControl, (value: unknown) => toUniqueStringArray(value), 0)

    const normalizedOptions = computed<AclOption[]>(() => {
      const rawSuggestions = controlApi.control.value.uischema.options?.suggestion
      if (!Array.isArray(rawSuggestions)) return []

      return rawSuggestions
        .map((entry, index) => {
          if (!entry || typeof entry !== 'object') return null
          const option = entry as Record<string, unknown>
          const label = typeof option.label === 'string' ? option.label : ''
          const value = toUniqueStringArray(option.value)
          if (!label || value.length === 0) return null
          return {
            key: `${index}-${label}`,
            label,
            value,
          }
        })
        .filter((entry): entry is AclOption => Boolean(entry))
    })

    const selectedKey = computed(() => {
      const currentValue = toUniqueStringArray(controlApi.control.value.data)
      const match = normalizedOptions.value.find(option => sameActionSet(option.value, currentValue))
      return match?.key ?? null
    })

    const onUpdate = (key: string | null) => {
      if (!key) {
        controlApi.onChange([])
        return
      }

      const option = normalizedOptions.value.find(item => item.key === key)
      controlApi.onChange(option ? option.value : [])
    }

    return {
      ...controlApi,
      normalizedOptions,
      selectedKey,
      onUpdate,
    }
  },
})

export default controlRenderer
</script>
