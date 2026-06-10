import { computed, ref, watch } from 'vue'
import { first, get, isArray, isEmpty, isNumber, isObject, isString } from 'radash'
import { useNuxtApp } from '#imports'
import { determineClearValue, useQuasarControl } from '../../utils'
import type { useJsonFormsEnumControl } from '@jsonforms/vue'
import {
  extractAutocompleteApiConfig,
  buildAutocompleteRequest,
  resolveFetchedOptions,
} from './useAutocompleteControl'

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

export const normalizeArrayControlData = (data: unknown): unknown[] | null => {
  if (data === null || data === undefined) {
    return null
  }

  if (Array.isArray(data)) {
    return data
  }

  if (typeof data === 'string' && data.trim().length === 0) {
    return []
  }

  return [data]
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

  const modelValue = computed(() => {
    const data = control.control.value.data

    if (!isArrayControl.value) {
      return data ?? null
    }

    return normalizeArrayControlData(data) ?? null
  })

  watch(
    () => control.control.value.data,
    (data) => {
      if (!isArrayControl.value) {
        return
      }

      if (data !== null && data !== undefined && !Array.isArray(data)) {
        control.onChange(adaptTarget(normalizeArrayControlData(data) ?? []))
      }
    },
    { immediate: true },
  )

  const onChange = (value: unknown) => {
    if (isArrayControl.value) {
      const normalized = Array.isArray(value) ? value : normalizeArrayControlData(value) ?? []
      control.onChange(adaptTarget(normalized))
      return
    }

    control.onChange(adaptTarget(value))
  }

  const optionValueKey = computed(() =>
    resolveOptionKey(control.appliedOptions.value?.optionValue, 'value'),
  )

  const optionLabelKey = computed(() =>
    resolveOptionKey(control.appliedOptions.value?.optionLabel, 'label'),
  )

  const apiOptionsList = ref<any[]>([])
  const abortController = ref<AbortController | null>(null)

  const apiConfig = computed(() =>
    extractAutocompleteApiConfig(
      control.control.value.uischema.options,
      control.appliedOptions.value,
    ),
  )

  const suggestions = computed(() =>
    normalizeSuggestions(
      control.control.value.uischema.options?.suggestion,
      optionValueKey.value,
      optionLabelKey.value,
    ),
  )

  const resolvedOptions = computed(() => {
    if (apiOptionsList.value.length > 0) {
      return apiOptionsList.value
    }

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

  const clearPendingRequest = () => {
    if (abortController.value) {
      abortController.value.abort()
      abortController.value = null
    }
  }

  const fetchSuggestions = async (search = '') => {
    const api = apiConfig.value
    if (!api) {
      apiOptionsList.value = []
      return
    }

    const request = buildAutocompleteRequest(api, search)

    clearPendingRequest()
    abortController.value = new AbortController()

    const { $http } = useNuxtApp()

    try {
      const data = await $http.$get(request.url, {
        signal: abortController.value.signal,
        headers: request.headers,
        params: request.params,
      })

      const rawItems = api.itemsPath ? get(data, api.itemsPath) : data
      const items = isArray(rawItems) ? rawItems : []

      apiOptionsList.value = resolveFetchedOptions(
        items,
        api,
        optionLabelKey.value,
        optionValueKey.value,
        optionDisableKey.value,
      )
    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        console.warn('[enum-suggestion] API error:', error)
      }
      apiOptionsList.value = []
    }
  }

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
      const currentValue = normalizeArrayControlData(control.control.value.data) ?? []

      if (newValue != null && !currentValue.includes(newValue)) {
        const updatedValue = [...currentValue, newValue]
        onChange(updatedValue)
      }
    } else {
      onChange(newValue)
    }
    done()
  }

  return {
    ...control,
    adaptTarget,
    onChange,
    createValue,
    modelValue,
    isArrayControl,
    optionValueKey,
    optionLabelKey,
    suggestions,
    options: resolvedOptions,
    optionDisableKey,
    emitValue,
    apiConfig,
    fetchSuggestions,
  }
}
