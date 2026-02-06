<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    v-model:is-hovered="isHovered"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  )
    //- Champ pseudo-input cliquable pour déclencher l'upload
    q-field.cursor-pointer(
      @focus="onFieldClick"
      @clear="clearSelection"
      :model-value="displayValue"
      :id="inputId"
      :label="computedLabel"
      :class="styles.control.input"
      clear-icon="mdi-close"
      :disable="!control.enabled"
      :required="control.required"
      :placeholder="appliedOptions.placeholder || 'Choisir un fichier…'"
      :hide-bottom-space="!!control.description"
      :hint="control.description"
      :hide-hint="persistentHint()"
      :error="control.errors !== ''"
      :clearable="isClearable"
      :error-message="control.errors"
      outlined
      dense
    )
      template(#prepend)
        q-avatar(v-if="!multiple && selectedItems.length" size="24px")
          q-icon(:name="getMimeIcon(selectedItems[0])" size="16px" color="grey-7")
      template(#append)
        q-btn(v-if="selectedItems.length && !multiple && !isFieldReadonly"
          icon="mdi-eye"
          @click.stop.prevent="showPreview(selectedItems[0])"
          @mousedown.stop.prevent
          color="grey-7"
          :disable="false"
          unelevated
          dense
          flat
        )
          q-tooltip
            span Prévisualiser
        q-btn(v-if="!isFieldReadonly"
          :icon="appliedOptions.uploadIcon || 'mdi-upload'"
          :label="appliedOptions.uploadLabel || ''"
          @click.stop.prevent="onUploadClick"
          @mousedown.stop.prevent
          :loading="uploadLoading"
          :color="appliedOptions.uploadColor || 'primary'"
          unelevated
          dense
          flat
        )
          q-tooltip
            span Uploader un fichier
      template(#hint)
        span {{ control.description }}
      template(#control)
        div.self-center.full-width.no-outline(tabindex='0') {{ displayValue }}

    //- Input file caché pour upload
    input(type="file" ref="fileInput" class="hidden" :multiple="multiple" :accept="acceptAttr" @change="onFilesChosen")

    //- Chips de sélection en mode multiple
    div(v-if="multiple && normalizedSelectedItems.length" class="row items-center q-gutter-xs q-mt-xs")
      q-chip(
        v-for="(sel, idx) in normalizedSelectedItems"
        :key="idx"
        outline
        removable
        @remove="removeSelectionAt(idx)"
        :icon="getMimeIcon(sel)"
        clickable
        @click.stop="showPreview(sel)"
      ) {{ sel.label }}

    //- Dialog de prévisualisation
    file-preview(v-model="previewDialog" :item="previewItem")
</template>

<script lang="ts">
import { type ControlElement, type JsonFormsRendererRegistryEntry, rankWith, isStringControl, and, optionIs, or, isObjectArrayControl, isObjectControl } from '@jsonforms/core'
import { defineComponent, ref, computed } from 'vue'
import { rendererProps, type RendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { ControlWrapper, FilePreview } from '../common'
import { determineClearValue } from '../utils'
import { useMediaPickerControl } from '../composables'
import { QField, QAvatar, QIcon, QBtn, QChip } from 'quasar'
import { fileTypeFromBuffer } from 'file-type'
import mime from 'mime'

const controlRenderer = defineComponent({
  name: 'FileUploadControl',
  components: {
    ControlWrapper,
    FilePreview,
    QField,
    QAvatar,
    QIcon,
    QBtn,
    QChip,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue(undefined)

    const api = useMediaPickerControl({
      jsonFormsControl,
      clearValue,
      debounceWait: 100,
    })

    const fileInput = ref<any>(null)

    /**
     * Normalise les selectedItems pour extraire le bon label
     * Si la value est un objet { type, name, data }, utilise name comme label
     */
    const normalizedSelectedItems = computed(() => {
      return api.selectedItems.value.map((item: any, idx: number) => {
        let label = item.label || ''

        // Si la value est un objet base64 avec name, utiliser name comme label
        if (item.value && typeof item.value === 'object' && item.value.name) {
          label = item.value.name
        }

        // Fallback si pas de label valide
        if (!label || (typeof label === 'string' && (label.startsWith('data:') || label.length > 100))) {
          label = `Fichier ${idx + 1}`
        }

        return {
          ...item,
          label,
        }
      })
    })

    /**
     * Mode de stockage : 'base64' ou 'file'
     * - base64 : convertit les fichiers en base64 strings (usage classique, formulaires)
     * - file : garde les objets File natifs pour multipart/form-data
     * Configuré via appliedOptions.storageMode
     */
    const storageMode = computed(() => {
      const mode = (api.appliedOptions.value as any)?.storageMode
      if (mode === 'file' || mode === 'base64') return mode
      return 'base64' // Mode par défaut
    })

    const isFieldReadonly = computed(() => {
      const optRo = (api.appliedOptions.value as any)?.readonly
      const schemaRo = (api.control.value as any)?.schema?.readOnly
      const apiRo = (api as any).isReadonly?.value
      return Boolean(optRo || schemaRo || apiRo)
    })

    const displayValue = computed(() => {
      // Vérifier d'abord selectedItems
      if (api.selectedItems.value.length) {
        if (api.multiple.value) return `${api.selectedItems.value.length} fichier(s) sélectionné(s)`
        const sel = api.selectedItems.value[0]
        // Si le label est un data URL ou base64, ne pas l'afficher
        const label = sel.label || ''
        if (typeof label === 'string' && (label.startsWith('data:') || label.length > 100)) {
          return '1 fichier sélectionné'
        }
        return label || '1 fichier sélectionné'
      }

      // Si pas de selectedItems mais qu'il y a une valeur, afficher un message générique
      const modelValue = api.control.value.data
      if (modelValue != null && modelValue !== '') {
        if (Array.isArray(modelValue)) {
          return `${modelValue.length} fichier(s) sélectionné(s)`
        }
        return '1 fichier sélectionné'
      }

      return ''
    })

    const acceptAttr = computed(() => {
      const acc = api.mediaOptions.value.accept
      if (!acc) return undefined
      return Array.isArray(acc) ? acc.join(',') : acc
    })

    const getFileExtension = (url: string) => {
      if (!url || typeof url !== 'string') return ''
      const pathname = url.split('?')[0]
      const parts = pathname.split('.')
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
    }

    const getFileMimeType = (item: any) => {
      if (!item) return ''
      if (item?.mimeType) return String(item.mimeType).toLowerCase()
      if (item?.type) return String(item.type).toLowerCase()
      const v = item?.value

      // Si la value est un objet avec type/name/data (format base64)
      if (v && typeof v === 'object' && v.type && v.data) {
        return String(v.type).toLowerCase()
      }

      if (typeof (globalThis as any).File !== 'undefined' && v instanceof (globalThis as any).File) {
        return String(v.type || '').toLowerCase()
      }
      // Détection depuis data URL
      if (typeof v === 'string' && v.startsWith('data:')) {
        const mimeMatch = /data:([^;,]+)/.exec(v)
        if (mimeMatch) return mimeMatch[1].toLowerCase()
      }
      const src = item?.thumbnail || item?.value || ''
      const ext = getFileExtension(typeof src === 'string' ? src : '')
      if (!ext) return ''
      return mime.getType(ext) || ''
    }

    const getMimeIcon = (item: any) => {
      if (!item) return 'mdi-file'
      const mt = getFileMimeType(item)
      if (mt.startsWith('image/')) return 'mdi-image'
      if (mt === 'application/pdf') return 'mdi-file-pdf-box'
      if (mt.includes('word') || mt.includes('document')) return 'mdi-file-word-box'
      if (mt.includes('excel') || mt.includes('spreadsheet')) return 'mdi-file-excel-box'
      if (mt.includes('powerpoint') || mt.includes('presentation')) return 'mdi-file-powerpoint-box'
      if (mt.startsWith('video/')) return 'mdi-video-box'
      if (mt.startsWith('audio/')) return 'mdi-music-box'
      if (mt.startsWith('text/')) return 'mdi-text-box'
      return 'mdi-file'
    }

    const isFileTypeAccepted = async (file: File, acceptPattern: string): Promise<boolean> => {
      const buffer = await file.slice(0, 4100).arrayBuffer()
      const uint8Array = new Uint8Array(buffer)
      const detectedType = await fileTypeFromBuffer(uint8Array)
      const detectedMime = detectedType?.mime?.toLowerCase() || ''

      if (acceptPattern.includes('/*')) {
        const baseType = acceptPattern.split('/')[0]
        if (detectedMime && detectedMime.startsWith(baseType + '/')) return true
        return false
      }
      if (acceptPattern.includes('/')) {
        if (detectedMime === acceptPattern.toLowerCase()) return true
        return false
      }
      if (acceptPattern.startsWith('.')) {
        return file.name.toLowerCase().endsWith(acceptPattern.toLowerCase())
      }
      return false
    }

    // Conversion File -> Base64
    const fileToBase64 = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result)
          } else {
            reject(new Error('FileReader result is not a string'))
          }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsDataURL(file)
      })
    }

    // Preview helpers
    const previewDialog = ref(false)
    const previewItem = ref<any>(null)

    const showPreview = (item: any) => {
      previewItem.value = item
      previewDialog.value = true
    }

    const uploadLoading = ref(false)

    /**
     * Traitement des fichiers sélectionnés
     * Selon le mode :
     * - base64 : convertit en base64 strings
     * - file : conserve les objets File natifs
     */
    const onFilesChosen = async (e: Event) => {
      const target = e.target as any
      const filesAny = target.files ? Array.from(target.files) : []
      const files = (filesAny as any[]).filter((f) => f && typeof f === 'object') as File[]
      if (!files.length) return

      const acc = api.mediaOptions.value.accept
      if (acc) {
        const acceptPatterns = Array.isArray(acc) ? acc : acc.split(',').map((s: string) => s.trim())
        const invalidFiles: string[] = []
        const validFiles: File[] = []

        for (const file of files) {
          let isValid = false
          for (const pattern of acceptPatterns) {
            if (await isFileTypeAccepted(file, pattern)) {
              isValid = true
              break
            }
          }
          if (isValid) validFiles.push(file)
          else invalidFiles.push(file.name)
        }

        if (invalidFiles.length > 0) {
          const acceptStr = acceptPatterns.join(', ')
          ;(globalThis as any).alert?.(`Les fichiers suivants ne sont pas acceptés (types autorisés: ${acceptStr}):\n${invalidFiles.join('\n')}`)
        }

        if (!validFiles.length) {
          if (fileInput.value) fileInput.value.value = ''
          return
        }

        await processFiles(validFiles)
      } else {
        await processFiles(files)
      }

      if (fileInput.value) fileInput.value.value = ''
    }

    /**
     * Traite les fichiers selon le mode de stockage
     */
    const processFiles = async (files: File[]) => {
      const mode = storageMode.value

      if (mode === 'base64') {
        // Mode base64 : convertit les fichiers en base64 avec structure d'objet { type, name, data }
        uploadLoading.value = true
        try {
          const items = await Promise.all(
            files.map(async (f) => {
              const base64 = await fileToBase64(f)
              // Structure similaire à File: { type, name, data }
              const fileObject = {
                type: f.type,
                name: f.name,
                data: base64,
              }
              return {
                label: f.name,
                value: fileObject,
                mimeType: f.type,
              }
            }),
          )
          api.addSelection(items as any)
        } catch (error) {
          console.error('Erreur lors de la conversion en base64:', error)
          ;(globalThis as any).alert?.('Erreur lors de la conversion des fichiers')
        } finally {
          uploadLoading.value = false
        }
      } else {
        // Mode file : conserve les objets File natifs
        const items = files.map((f) => ({
          label: f.name,
          value: f,
          mimeType: f.type,
        }))
        api.addSelection(items as any)
      }
    }

    const onUploadClick = () => {
      const el = fileInput.value as any
      const ae = (globalThis as any).document?.activeElement as any
      ae?.blur?.()
      if (el && typeof el.click === 'function') el.click()
    }

    const onInputClick = (e?: Event) => {
      if (isFieldReadonly.value) return
      e?.preventDefault?.()
      e?.stopPropagation?.()
      const ae = (globalThis as any).document?.activeElement as any
      ae?.blur?.()
      onUploadClick()
    }

    const onFieldClick = (e?: Event) => {
      if (isFieldReadonly.value) return
      // Vérifier si le clic vient du bouton clear
      const target = e?.target as HTMLElement
      if (target?.closest?.('.q-field__focusable-action')) {
        // C'est le bouton clear, ne pas ouvrir l'upload
        return
      }
      e?.preventDefault?.()
      e?.stopPropagation?.()
      const ae = (globalThis as any).document?.activeElement as any
      ae?.blur?.()
      onUploadClick()
    }

    return {
      onFieldClick,
      ...api,
      fileInput,
      normalizedSelectedItems,
      storageMode,
      isFieldReadonly,
      acceptAttr,
      displayValue,
      getMimeIcon,
      onUploadClick,
      onFilesChosen,
      onInputClick,
      uploadLoading,
      previewDialog,
      previewItem,
      showPreview,
    }
  },
})

export default controlRenderer

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  // prettier-ignore
  tester: rankWith(3,
    and(
      or(
        isStringControl,
        isObjectArrayControl,
        isObjectControl,
      ),
      optionIs('format', 'file'),
    ),
  ), // Rend prioritaire les contrôles string, object ou array avec options.format === 'file'
}
</script>

<style lang="scss" scoped>
.hidden {
  display: none;
}
</style>
