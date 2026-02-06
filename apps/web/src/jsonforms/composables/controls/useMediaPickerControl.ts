import { computed, reactive, ref } from 'vue'
import { get, isArray, isObject, isString } from 'radash'
import { buildControlElementId, determineClearValue, useQuasarControl } from '../../utils'
import type { useJsonFormsControl } from '@jsonforms/vue'
import { isArraySchemaControl, resolveOptionKey } from './useEnumSuggestionControl'

type JsonFormsControl = ReturnType<typeof useJsonFormsControl>

export interface MediaGalleryApiConfig {
  url: string
  base?: string
  itemsPath?: string
  params?: Record<string, unknown>
  headers?: Record<string, string>
  labelKey?: string
  valueKey?: string
  thumbnailKey?: string
}

export interface MediaUploadApiConfig {
  url: string
  base?: string
  field?: string // form-data field name, default: "file"
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

export interface MediaPickerOptions {
  multiple?: boolean
  allowUpload?: boolean
  accept?: string | string[]
  autoSelectUploaded?: boolean
  gallery?: MediaGalleryApiConfig
  upload?: MediaUploadApiConfig
  // Nouveau: persistance côté UI
  storeFileAsObjectUrl?: boolean
  storeBase64AsObjectUrl?: boolean
  overwriteWithResponse?: boolean
}

export interface MediaListItem {
  label: string
  value: any
  thumbnail?: string
  disable?: boolean
  raw?: any
}

const toArray = <T>(v: T | T[] | undefined | null): T[] => {
  if (!v && v !== 0) return []
  return Array.isArray(v) ? v : [v]
}

const fileNameFromUrl = (input: unknown): string => {
  const v = typeof input === 'string' ? input : ''
  try {
    const origin = (globalThis as any)?.location?.origin ?? 'http://localhost'
    const url = new URL(v, origin)
    const parts = url.pathname.split('/')
    return parts[parts.length - 1] || v
  } catch {
    const parts = v.split('/')
    return parts[parts.length - 1] || v
  }
}

export const buildGalleryRequest = (
  api: MediaGalleryApiConfig,
  extraParams?: Record<string, unknown>,
): { url: string; headers: Record<string, string> } => {
  // Support relative URLs by resolving against current origin when no base is provided
  const origin = (globalThis as any)?.location?.origin ?? 'http://localhost'
  const baseUrl = api.base ? new URL(api.url, api.base) : new URL(api.url, origin)
  const params = { ...(api.params ?? {}), ...(extraParams ?? {}) }
  Object.entries(params).forEach(([k, v]) => baseUrl.searchParams.set(k, String(v)))

  return {
    url: baseUrl.toString(),
    headers: api.headers ?? {},
  }
}

export const resolveGalleryItems = (
  items: any[],
  api: MediaGalleryApiConfig,
  optionLabelKey = 'label',
  optionValueKey = 'value',
): MediaListItem[] => {
  const labelKey = api.labelKey ?? 'label'
  const valueKey = api.valueKey ?? 'value'
  const thumbnailKey = api.thumbnailKey ?? 'thumbnail'

  return items.map((it) => {
    const label = get(it, labelKey)
    const value = get(it, valueKey)
    const thumb = get(it, thumbnailKey)

    const fallbackLabel = isString(value) ? fileNameFromUrl(value) : String(label ?? value ?? '')
    const normalized: MediaListItem = {
      raw: isObject(it) ? it : undefined,
      label: String(label ?? fallbackLabel ?? ''),
      value: value ?? it,
      thumbnail: isString(thumb) ? thumb : (isString(value) ? value : undefined),
    }

      // also mirror as generic keys for internal uniformity
      ; (normalized as any)[optionLabelKey] = normalized.label
      ; (normalized as any)[optionValueKey] = normalized.value

    return normalized
  })
}

export type UseMediaPickerControlOptions = {
  jsonFormsControl: JsonFormsControl
  clearValue?: unknown
  debounceWait?: number
}

export const useMediaPickerControl = ({
  jsonFormsControl,
  clearValue = determineClearValue(undefined),
  debounceWait = 100,
}: UseMediaPickerControlOptions) => {
  const adaptTarget = (value: unknown) => value ?? clearValue
  const control = useQuasarControl(jsonFormsControl, adaptTarget, debounceWait)

  const optionValueKey = computed(() => resolveOptionKey(control.appliedOptions.value?.optionValue, 'value'))
  const optionLabelKey = computed(() => resolveOptionKey(control.appliedOptions.value?.optionLabel, 'label'))
  const thumbnailKey = computed(() => {
    const k = control.appliedOptions.value?.thumbnailKey
    return typeof k === 'string' && k.trim() ? k : 'thumbnail'
  })

  const mediaOptions = computed<MediaPickerOptions>(() => {
    const raw = (control.appliedOptions.value?.media || {}) as MediaPickerOptions & Record<string, any>
    // Conserver toutes les clés fournies par l'appelant
    const normalized: MediaPickerOptions = {
      ...raw,
      multiple: raw?.multiple,
      allowUpload: raw?.allowUpload,
      accept: raw?.accept,
      autoSelectUploaded: raw?.autoSelectUploaded ?? true,
      gallery: raw?.gallery,
      upload: raw?.upload,
      storeFileAsObjectUrl: raw?.storeFileAsObjectUrl,
      storeBase64AsObjectUrl: raw?.storeBase64AsObjectUrl,
      overwriteWithResponse: raw?.overwriteWithResponse,
    }
    return normalized
  })

  // Determine multiplicity from schema.type
  const isArrayControlRef = computed(() => {
    const schemaType = (control.control.value as any)?.schema?.type
    if (Array.isArray(schemaType)) return schemaType.includes('array')
    return schemaType === 'array'
  })
  const multiple = computed(() => mediaOptions.value.multiple ?? isArrayControlRef.value)

  const inputId = computed(() => buildControlElementId(control.elementId.value, ['media', 'input']))

  // Selection state derived from model
  const modelValue = computed<any>(() => control.control.value.data)

  const selectedItems = computed<MediaListItem[]>(() => {
    const mapOne = (v: any): MediaListItem => {
      // Support direct File objects stored in the model
      if (typeof (globalThis as any).File !== 'undefined' && v instanceof (globalThis as any).File) {
        const file = v as File
        return {
          raw: file,
          label: file.name || 'Fichier',
          value: file,
          // thumbnail could be an object URL for images; keep undefined to avoid URL management here
          thumbnail: undefined,
        }
      }

      if (isObject(v)) {
        const label = get(v, optionLabelKey.value) ?? get(v, 'label')
        const value = get(v, optionValueKey.value) ?? get(v, 'value') ?? v
        const thumb = get(v, thumbnailKey.value) ?? get(v, 'thumbnail')
        return {
          raw: v,
          label: String(label ?? (isString(value) ? fileNameFromUrl(value) : '')),
          value,
          thumbnail: isString(thumb) ? thumb : (isString(value) ? value : undefined),
        }
      }

      const value = v
      return {
        label: isString(value) ? fileNameFromUrl(value) : String(value ?? ''),
        value,
        thumbnail: isString(value) ? value : undefined,
      }
    }

    const raw = modelValue.value
    return multiple.value ? toArray(raw).map(mapOne) : (raw == null ? [] : [mapOne(raw)])
  })

  // Gallery listing
  const galleryLoading = ref(false)
  const galleryError = ref<string | null>(null)
  const galleryItems = ref<MediaListItem[]>([])

  const fetchGallery = async (extraParams?: Record<string, unknown>) => {
    const api = mediaOptions.value.gallery
    if (!api?.url) {
      galleryItems.value = []
      return
    }

    const request = buildGalleryRequest(api, extraParams)
    galleryLoading.value = true
    galleryError.value = null
    try {
      const res = await fetch(request.url, { headers: request.headers })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const rawItems = api.itemsPath ? get(data, api.itemsPath) : data
      const items = isArray(rawItems) ? rawItems : []
      galleryItems.value = resolveGalleryItems(
        items,
        api,
        optionLabelKey.value,
        optionValueKey.value,
      )
    } catch (e: any) {
      galleryError.value = e?.message || 'gallery fetch failed'
      galleryItems.value = []
    } finally {
      galleryLoading.value = false
    }
  }

  // Upload handler
  const uploadLoading = ref(false)
  const uploadError = ref<string | null>(null)

  const uploadFiles = async (files: File[]) => {
    const api = mediaOptions.value.upload
    if (!api?.url || files.length === 0) return [] as any[]

    const field = api.field || 'file'
    const origin = (globalThis as any)?.location?.origin ?? 'http://localhost'
    const url = api.base ? new URL(api.url, api.base).toString() : new URL(api.url, origin).toString()
    const form = new FormData()
    files.forEach((f) => form.append(field, f))
    Object.entries(api.params ?? {}).forEach(([k, v]) => form.append(k, String(v)))

    uploadLoading.value = true
    uploadError.value = null
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: api.headers ?? {},
        body: form,
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // Upload API response might be array or single object
      const uploaded = isArray(data) ? data : [data]
      // After upload, refresh gallery (best effort)
      await fetchGallery()
      return uploaded
    } catch (e: any) {
      uploadError.value = e?.message || 'upload failed'
      return []
    } finally {
      uploadLoading.value = false
    }
  }

  // Mutations on selection
  const buildStoredValue = (items: MediaListItem[] | MediaListItem) => {
    const mapToStored = (it: MediaListItem) => {
      // Always store the option value (primitive or serializable reference)
      return (it as any).value
    }
    if (Array.isArray(items)) {
      const arr = items.map(mapToStored)
      return arr.length === 0 ? clearValue : arr
    }
    return mapToStored(items)
  }

  const valueKeyOf = (it: MediaListItem): string => {
    const v = (it && (it as any).value !== undefined) ? (it as any).value : it
    if (v === null || v === undefined) return ''
    // Stable key for File objects
    if (typeof (globalThis as any).File !== 'undefined' && v instanceof (globalThis as any).File) {
      const f = v as File
      return `file:${f.name}:${f.size}:${f.lastModified}`
    }
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      return String(v)
    }
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }

  const addSelection = (items: MediaListItem | MediaListItem[]) => {
    const current = selectedItems.value.slice()
    const toAdd = Array.isArray(items) ? items : [items]

    if (!multiple.value) {
      const candidate = toAdd[0]
      const already = current[0] && valueKeyOf(current[0]) === valueKeyOf(candidate)
      const nextItem = already ? current[0] : candidate
      control.onChange(buildStoredValue(nextItem))
      return
    }

    const merged = [...current, ...toAdd]
    const seen = new Set<string>()
    const unique: MediaListItem[] = []
    for (const it of merged) {
      const key = valueKeyOf(it)
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(it)
    }
    control.onChange(buildStoredValue(unique))
  }

  const removeSelectionAt = (idx: number) => {
    const current = selectedItems.value.slice()
    current.splice(idx, 1)
    control.onChange(buildStoredValue(current))
  }

  const clearSelection = () => {
    control.onChange(clearValue)
  }

  // Disable already selected items in gallery
  const selectedKeySet = computed(() => {
    const set = new Set<string>()
    selectedItems.value.forEach((it) => set.add(valueKeyOf(it)))
    return set
  })

  const galleryOptions = computed<MediaListItem[]>(() => {
    return galleryItems.value.map((it) => ({
      ...it,
      disable: selectedKeySet.value.has(valueKeyOf(it)),
    }))
  })

  // Normalize any raw API items (e.g., upload responses) using applied options
  const mapRawItemsToOptions = (rawItems: any[]): MediaListItem[] => {
    const gal = (mediaOptions.value.gallery || {}) as Partial<MediaGalleryApiConfig>
    const upl = (mediaOptions.value.upload || {}) as any

    // Si gallery n'est pas défini, essayer d'utiliser les clés de l'upload ou valeurs par défaut
    const apiCfg: MediaGalleryApiConfig = {
      url: gal.url || upl.url || '',
      base: gal.base,
      itemsPath: gal.itemsPath,
      params: gal.params,
      headers: gal.headers,
      labelKey: gal.labelKey || upl.labelKey || 'originalName',
      valueKey: gal.valueKey || upl.valueKey || 'publicLink',
      thumbnailKey: gal.thumbnailKey || upl.thumbnailKey || 'thumbnail',
    }

    const items = isArray(rawItems) ? rawItems : []
    return resolveGalleryItems(
      items,
      apiCfg,
      optionLabelKey.value,
      optionValueKey.value,
    )
  }

  const isSelected = (it: MediaListItem) => selectedKeySet.value.has(valueKeyOf(it))

  return {
    ...control,
    adaptTarget,
    optionLabelKey,
    optionValueKey,
    thumbnailKey,
    mediaOptions,
    multiple,
    modelValue,
    inputId,
    selectedItems,
    galleryItems,
    galleryOptions,
    selectedKeySet,
    isSelected,
    galleryLoading,
    galleryError,
    fetchGallery,
    uploadLoading,
    uploadError,
    uploadFiles,
    mapRawItemsToOptions,
    addSelection,
    removeSelectionAt,
    clearSelection,
  }
}
