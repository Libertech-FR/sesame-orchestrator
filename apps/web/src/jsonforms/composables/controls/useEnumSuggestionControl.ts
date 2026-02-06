import { computed } from 'vue'
import { first, isArray, isEmpty, isNumber, isObject, isString } from 'radash'
import { determineClearValue, useQuasarControl } from '../../utils'
import type { useJsonFormsEnumControl } from '@jsonforms/vue'

type JsonFormsEnumControl = ReturnType<typeof useJsonFormsEnumControl>

type UseEnumSuggestionControlOptions = {
  jsonFormsControl: JsonFormsEnumControl
  clearValue?: unknown
  debounceWait?: number
}

export const createEnumAdaptTarget = (clearValue: unknown) => {
  const isBlankValue = (v: unknown) => {
    if (v === null || v === undefined) return true
    if (typeof v === 'string') return v.trim().length === 0
    if (Array.isArray(v)) return v.length === 0
    if (isObject(v) && !isArray(v)) return Object.keys(v).length === 0
    // Numbers (including 0 and negatives) and booleans are considered non-blank
    return false
  }

  return (value: unknown) => (isBlankValue(value) ? clearValue : value)
}

export const isArraySchemaControl = (control: JsonFormsEnumControl['control']['value']) => {
  const schemaType = control.schema?.type

  if (schemaType === 'array') {
    return true
  }

  if (isArray(schemaType)) {
    return schemaType.includes('array')
  }

  return false
}

export const resolveOptionKey = (value: unknown, fallback: string): string => {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback
}

export const normalizeSuggestions = (
  suggestions: unknown,
  optionValueKey = 'value',
  optionLabelKey = 'label',
): Array<string | Record<string, unknown> | { [key: string]: unknown }> | undefined => {
  if (!suggestions) {
    return undefined
  }

  if (!isArray(suggestions)) {
    console.warn('Suggestions must be an array')
    return undefined
  }

  const validSuggestions = suggestions
    .filter((suggestion) => {
      if (isString(suggestion) || isNumber(suggestion)) {
        return true
      }

      if (
        isObject(suggestion) &&
        optionValueKey in suggestion &&
        optionLabelKey in suggestion
      ) {
        return true
      }

      console.warn('Invalid suggestion item:', suggestion)
      return false
    })

  return !isEmpty(validSuggestions) ? validSuggestions : undefined
}

export const useEnumSuggestionControl = ({
  jsonFormsControl,
  clearValue = determineClearValue(undefined),
  debounceWait = 100,
}: UseEnumSuggestionControlOptions) => {
  const adaptTarget = createEnumAdaptTarget(clearValue)
  const control = useQuasarControl(jsonFormsControl, adaptTarget, debounceWait)

  const isArrayControl = computed(() => isArraySchemaControl(control.control.value))

  const optionValueKey = computed(() =>
    resolveOptionKey(control.appliedOptions.value?.optionValue, 'value'),
  )

  const optionLabelKey = computed(() =>
    resolveOptionKey(control.appliedOptions.value?.optionLabel, 'label'),
  )

  const suggestions = computed(() =>
    normalizeSuggestions(
      control.control.value.uischema.options?.suggestion,
      optionValueKey.value,
      optionLabelKey.value,
    ),
  )

  const resolvedOptions = computed(() => {
    const controlOptions = control.control.value.options
    if (isArray(controlOptions) && controlOptions.length > 0) {
      return controlOptions
    }

    return suggestions.value ?? []
  })

  const optionDisableKey = computed(() => {
    const applied = control.appliedOptions.value?.optionDisable
    if (typeof applied === 'string' && applied.trim().length > 0) {
      return applied
    }

    return 'disable'
  })

  const emitValue = computed(() => {
    const override = control.appliedOptions.value?.emitValue
    if (typeof override === 'boolean') {
      return override
    }

    const sampleOption = first(
      resolvedOptions.value.filter((option) => option !== null && option !== undefined),
    )

    if (sampleOption !== undefined) {
      return isObject(sampleOption) && !isArray(sampleOption)
    }

    return (
      isObject(control.control.value.data) &&
      !isArray(control.control.value.data)
    )
  })

  const createValue = (newValue: unknown, done: () => void) => {
    if (isArrayControl.value) {
      const currentValue = Array.isArray(control.control.value.data)
        ? control.control.value.data
        : []

      if (newValue != null && !currentValue.includes(newValue)) {
        const updatedValue = [...currentValue, newValue]
        control.onChange(adaptTarget(updatedValue))
      }
    } else {
      control.onChange(adaptTarget(newValue))
    }
    done()
  }

  return {
    ...control,
    adaptTarget,
    createValue,
    isArrayControl,
    optionValueKey,
    optionLabelKey,
    suggestions,
    options: resolvedOptions,
    optionDisableKey,
    emitValue,
  }
}
