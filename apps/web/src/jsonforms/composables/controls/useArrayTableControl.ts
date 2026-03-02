import { computed, ref } from 'vue'
import { useQuasarControl } from '../../utils'
import { useNuxtApp } from '#imports'
import { get, isArray } from 'radash'
import {
  type AutocompleteApiConfig,
  buildAutocompleteRequest,
  mapSuggestionsToOptions,
  resolveFetchedOptions,
} from './useAutocompleteControl'

type QuasarControlInput = Parameters<typeof useQuasarControl>[0]

type UseArrayTableControlOptions = {
  jsonFormsControl: QuasarControlInput
  clearValue: unknown
  debounceWait?: number
}

type FieldType = 'string' | 'number' | 'integer' | 'boolean' | 'array'

export type ArrayTableField = {
  key: string
  label: string
  type: FieldType
  itemType?: 'string' | 'number' | 'integer'
  suggestions?: unknown[]
  uiOptions?: Record<string, any>
  uiElement?: Record<string, any>
  api?: AutocompleteApiConfig
}

const cloneValue = <T>(value: T): T => {
  return JSON.parse(JSON.stringify(value)) as T
}

const toTitleCase = (value: string): string => {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const buildDefaultValue = (field: ArrayTableField) => {
  if (field.type === 'array') return []
  if (field.type === 'boolean') return false
  if (field.type === 'number' || field.type === 'integer') return null
  return ''
}

export const useArrayTableControl = ({
  jsonFormsControl,
  clearValue,
  debounceWait = 100,
}: UseArrayTableControlOptions) => {
  const control = useQuasarControl(jsonFormsControl, (v) => v ?? clearValue, debounceWait)
  const { $http } = useNuxtApp()

  const rows = computed<Record<string, any>[]>(() => {
    const value = control.control.value.data
    return Array.isArray(value) ? value : []
  })

  const itemSchema = computed<any>(() => control.control.value.schema?.items ?? {})
  const properties = computed<Record<string, any>>(() => itemSchema.value?.properties ?? {})
  const uiElements = computed<any[]>(() => {
    const elements = control.control.value.uischema?.options?.elements
    return Array.isArray(elements) ? elements : []
  })

  const scopeToPropertyKey = (scope: unknown): string | undefined => {
    if (typeof scope !== 'string') return undefined
    const match = /#\/properties\/(.+)$/.exec(scope.trim())
    return match?.[1]
  }

  const buildField = (key: string, schema: any, uiElement?: any): ArrayTableField => {
    const schemaType = schema?.type
    const type = Array.isArray(schemaType) ? schemaType[0] : schemaType
    const itemType = schema?.items?.type
    const uiOptions = uiElement?.options || {}
    const uiSuggestions = Array.isArray(uiOptions?.suggestion)
      ? uiOptions.suggestion
      : Array.isArray(uiOptions?.suggestions)
        ? uiOptions.suggestions
        : []
    const schemaSuggestions = Array.isArray(schema?.items?.enum)
      ? schema.items.enum
      : Array.isArray(schema?.suggestion)
        ? schema.suggestion
        : []
    const suggestions = uiSuggestions.length > 0 ? uiSuggestions : schemaSuggestions

    return {
      key,
      label: uiElement?.label || schema?.title || toTitleCase(key),
      type: (type || 'string') as FieldType,
      itemType,
      suggestions,
      uiOptions,
      uiElement,
      api: uiOptions?.api,
    }
  }

  const fields = computed<ArrayTableField[]>(() => {
    const propertyEntries = Object.entries(properties.value)
    const configuredFields: ArrayTableField[] = []
    const configuredKeys = new Set<string>()

    for (const element of uiElements.value) {
      if (element?.type !== 'Control') continue
      const key = scopeToPropertyKey(element?.scope)
      if (!key || !properties.value[key]) continue
      configuredFields.push(buildField(key, properties.value[key], element))
      configuredKeys.add(key)
    }

    const schemaFields = propertyEntries
      .filter(([key]) => !configuredKeys.has(key))
      .map(([key, schema]: [string, any]) => buildField(key, schema))

    return [...configuredFields, ...schemaFields]
  })

  const dialogOpen = ref(false)
  const editedIndex = ref<number | null>(null)
  const editedRow = ref<Record<string, any>>({})
  const fieldOptions = ref<Record<string, any[]>>({})

  const getFallbackOptions = (field: ArrayTableField) => {
    return mapSuggestionsToOptions(field.suggestions as any, 'label', 'value', 'disable') ?? []
  }

  const getFieldOptions = (field: ArrayTableField) => {
    return fieldOptions.value[field.key] ?? getFallbackOptions(field)
  }

  const fetchFieldOptions = async (field: ArrayTableField, search = '') => {
    if (!field.api?.url) {
      fieldOptions.value = {
        ...fieldOptions.value,
        [field.key]: getFallbackOptions(field),
      }
      return
    }

    const request = buildAutocompleteRequest(field.api, search)
    try {
      const data = await $http.$get(request.url, {
        headers: request.headers,
        params: request.params,
      })
      const rawItems = field.api.itemsPath ? get(data, field.api.itemsPath) : data
      const items = isArray(rawItems) ? rawItems : []
      fieldOptions.value = {
        ...fieldOptions.value,
        [field.key]: resolveFetchedOptions(items, field.api, 'label', 'value', 'disable'),
      }
    } catch (error) {
      console.warn('[array-table] API error:', error)
      fieldOptions.value = {
        ...fieldOptions.value,
        [field.key]: getFallbackOptions(field),
      }
    }
  }

  const preloadFieldOptions = async () => {
    const targets = fields.value.filter((field) => Boolean(field.api?.url))
    await Promise.all(targets.map((field) => fetchFieldOptions(field)))
  }

  const openCreateDialog = async () => {
    editedIndex.value = null
    editedRow.value = fields.value.reduce((acc, field) => {
      acc[field.key] = buildDefaultValue(field)
      return acc
    }, {} as Record<string, any>)
    await preloadFieldOptions()
    dialogOpen.value = true
  }

  const openEditDialog = async (row: Record<string, any>, index: number) => {
    editedIndex.value = index
    editedRow.value = cloneValue(row || {})
    await preloadFieldOptions()
    dialogOpen.value = true
  }

  const closeDialog = () => {
    dialogOpen.value = false
    editedIndex.value = null
  }

  const saveRow = () => {
    const nextRows = [...rows.value]

    if (editedIndex.value === null) {
      nextRows.push(cloneValue(editedRow.value))
    } else {
      nextRows[editedIndex.value] = cloneValue(editedRow.value)
    }

    control.onChange(nextRows)
    closeDialog()
  }

  const removeRow = (index: number) => {
    const nextRows = rows.value.filter((_, rowIndex) => rowIndex !== index)
    control.onChange(nextRows)
  }

  const formatCellValue = (value: unknown): string => {
    if (Array.isArray(value)) return value.join(', ')
    if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') return JSON.stringify(value)
    return String(value)
  }

  return {
    ...control,
    rows,
    itemSchema,
    fields,
    dialogOpen,
    editedRow,
    editedIndex,
    openCreateDialog,
    openEditDialog,
    closeDialog,
    saveRow,
    removeRow,
    formatCellValue,
    getFieldOptions,
    fetchFieldOptions,
  }
}
