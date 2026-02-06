<template lang="pug">
  div
    control-wrapper(
      v-bind="controlWrapper"
      v-model:is-hovered="isHovered"
      :styles="styles"
      :is-focused="isFocused"
      :applied-options="appliedOptions"
    )
      .column.q-gutter-sm
      //- Champ input qui ouvre la galerie en popup
      q-field.cursor-pointer(
        @focus="onInputClick"
        @clear="clearSelection"
        :model-value="displayValue"
        :id="inputId"
        :label="computedLabel"
        :class="styles.control.input"
        clear-icon="mdi-close"
        :disable="!control.enabled"
        :required="control.required"
        :placeholder="appliedOptions.placeholder || 'Choisir dans la galerie…'"
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
            //-img(v-if="isItemImage(selectedItems[0])" :src="displayPreviewSrc" :alt="selectedItems[0].label")
            //- q-icon(v-else :name="getMimeIcon(selectedItems[0])" size="16px" color="grey-7")
            q-icon(:name="getMimeIcon(selectedItems[0])" size="16px" color="grey-7")
        template(#append)
          q-btn(v-if="hasModelValue && displayMode === 'simple' && !isFieldReadonly"
            icon="mdi-eye"
            @click.stop="showPreview(selectedItems[0])"
            color="grey-7"
            :disable="false"
            unelevated
            dense
            flat
          )
            q-tooltip
              span Prévisualiser
          q-btn(v-if="mediaOptions.allowUpload && !isFieldReadonly"
            :icon="appliedOptions.uploadIcon || 'mdi-upload'"
            :label="appliedOptions.uploadLabel || ''"
            @click.stop="onUploadClick"
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

        //- Popup ancré directement au q-input (galleryMode: 'popup')
        q-popup-proxy(v-if="!isFieldReadonly && galleryMode === 'popup'" v-model="popupOpen" ref="popup" transition-show="scale" transition-hide="scale" @before-show="onPopupBeforeShow" :no-parent-event="true")
          q-card(style="min-width: 420px; max-width: 720px;")
            q-card-section(class="row items-center q-gutter-sm")
              span.text-subtitle2 Galerie
              q-space
              q-btn(flat round dense icon="mdi-refresh" :loading="galleryLoading" @click="fetchGallery()" autofocus)
            q-separator
            q-card-section
              div(v-if="galleryItems.length && !galleryLoading")
                .row.wrap.q-col-gutter-sm
                  .col-auto(v-for="(item, idx) in galleryItems" :key="idx")
                    q-card(flat bordered class="cursor-pointer relative-position" :class="{ 'q-pointer-events-none': isSelected(item) }" @click="onGalleryItemClick(item)")
                      q-img.img-bordered(v-if="item.thumbnail" :src="item.thumbnail" :alt="item.label" :style="{ width: galleryThumbSize, height: galleryThumbSize, objectFit: 'cover' }")
                      .q-pa-sm.text-caption.flex.flex-center.column.q-gutter-sm(v-else :style="{ width: galleryThumbSize, height: galleryThumbSize }")
                        q-icon(:name="getMimeIcon(item)" size="32px" color="grey-6")
                        span.text-center {{ item.label }}
                      div.absolute-full.flex.flex-center.bg-opacity-thumbnail.text-white(v-if="isSelected(item)")
                        q-icon(name="mdi-check-circle" size="24px")
              div(v-else-if="galleryLoading" class="row items-center q-gutter-sm")
                q-spinner(size="20px")
                span {{ appliedOptions.loadingLabel || 'Chargement…' }}
              div.text-negative.text-caption(v-else-if="galleryError") {{ galleryError }}

      //- Input file caché pour upload
      input(type="file" ref="fileInput" class="hidden" :multiple="multiple" :accept="acceptAttr" @change="onFilesChosen")

      //- Chips de sélection (display mode)
      div(v-if="displayMode === 'chips' && selectedItems.length" class="row items-center q-gutter-xs q-my-xs" @click.stop="closeGallery")
          q-chip(
            v-for="(sel, idx) in selectedItems"
            :key="idx"
            outline
            removable
            @remove="removeSelectionAt(idx)"
            :icon='getMimeIcon(sel)'
            clickable
            @click.stop="showPreview(sel)"
          ) {{ sel.label }}

      //- Affichage carte de la sélection (display mode)
      div.q-px-md(v-if="displayMode === 'card' && selectedItems.length" class="row wrap q-col-gutter-sm q-my-xs" @click.stop="closeGallery")
          .col-auto(v-for="(sel, idx) in selectedItems" :key="'sel-' + idx")
            q-card(flat bordered class="relative-position hover-parent" :class="{ 'cursor-pointer': enableZoomCursor && isItemImage(sel) }")
              q-img.img-bordered(v-if="isItemImage(sel)" :class="{ 'cursor-pointer': enableZoomCursor }" :src="sel.thumbnail || sel.value" :alt="sel.label" style="width: 96px; height: 96px; object-fit: cover;" @click.stop="showPreview(sel)")
              .q-pa-sm.text-caption.flex.flex-center.column.q-gutter-xs(v-else style="width: 96px; height: 96px; cursor: pointer;" @click.stop="showPreview(sel)")
                q-icon(:name="getMimeIcon(sel)" size="32px" color="grey-6")
                span.text-center.ellipsis(style="max-width: 80px;") {{ sel.label }}
              //- Overlay oeil centré (pour images et non-images)
              div(v-if="showEyeOverlay" class="absolute-full flex flex-center bg-opacity-thumbnail text-white hover-show" :class="{ 'cursor-pointer': enableZoomCursor && isItemImage(sel) }" style="cursor: pointer;" @click.stop="showPreview(sel)")
                q-icon(name="mdi-eye" size="22px")
              q-btn(v-if="!isFieldReadonly" round dense size="sm" icon="mdi-close" color="negative" class="absolute-top-right q-ma-xs hover-show" @click.stop="removeSelectionAt(idx)")

      //- Aperçu pleine largeur (display mode thumbnail)
      div(
        v-if="displayMode === 'thumbnail' && selectedItems.length && !multiple"
        class="q-mt-sm"
        @click.stop="closeGallery"
        :style="{ height: previewMaxHeight }"
      )
        .relative-position.hover-parent(:class="{ 'cursor-pointer': enableZoomCursor && isItemImage(selectedItems[0]) }")
          q-img.img-bordered(v-if="isItemImage(selectedItems[0])"
            :src="selectedItems[0].thumbnail || selectedItems[0].value"
            :alt="selectedItems[0].label"
            :height="previewMaxHeight"
            fit="contain"
            :style="{ width: '100%' }"
            :class="{ 'cursor-pointer': enableZoomCursor }"
            @click.stop="showPreview(selectedItems[0])"
          )
          .img-bordered.flex.flex-center.column.relative-position(v-else
            :style="{ display: 'flex', height: previewMaxHeight, width: '100%', background: 'rgba(0,0,0,0.03)', cursor: 'pointer', margin: 0, padding: 0, boxSizing: 'border-box' }"
            @click.stop="showPreview(selectedItems[0])"
          )
            q-icon(:name="getMimeIcon(selectedItems[0])" size="64px" color="grey-6")
            span.text-subtitle2.text-grey-7.text-center(style="max-width: 90%; word-break: break-word;") {{ selectedItems[0].label }}
            //- Overlay oeil pour les non-images
            div(v-if="showEyeOverlay" class="absolute-full flex flex-center bg-opacity-thumbnail text-white hover-show" style="cursor: pointer; margin: 0 !important;" @click.stop="showPreview(selectedItems[0])")
              q-icon(name="mdi-eye" size="22px")
          //- Overlay oeil centré (désactivable via appliedOptions)
          div(v-if="isItemImage(selectedItems[0]) && showEyeOverlay" class="absolute-full flex flex-center bg-opacity-thumbnail text-white hover-show" :class="{ 'cursor-pointer': enableZoomCursor }" @click.stop="showPreview(selectedItems[0])")
            q-icon(name="mdi-eye" size="22px")
          q-btn(v-if="!isFieldReadonly" round dense size="sm" icon="mdi-close" color="negative" class="absolute-top-right q-ma-sm hover-show" @click.stop="removeSelectionAt(0)")

    //- Dialog de galerie (galleryMode: 'dialog')
    q-dialog(v-model="galleryDialog" transition-show="slide-up" transition-hide="slide-down")
      q-card(style="min-width: 500px; max-width: 900px; width: 80vw;")
        q-bar(class="bg-primary text-white")
          span.text-subtitle1 Galerie
          q-space
          q-btn(flat round dense icon="mdi-refresh" :loading="galleryLoading" @click="fetchGallery()")
          q-btn(flat round dense icon="mdi-close" @click="closeGallery" autofocus)
        q-card-section
          div(v-if="galleryItems.length && !galleryLoading")
            .row.wrap.q-col-gutter-sm
              .col-auto(v-for="(item, idx) in galleryItems" :key="idx")
                q-card(flat bordered class="cursor-pointer relative-position" :class="{ 'q-pointer-events-none': isSelected(item) }" @click="onGalleryItemClick(item)")
                  q-img.img-bordered(v-if="item.thumbnail" :src="item.thumbnail" :alt="item.label" :style="{ width: galleryThumbSize, height: galleryThumbSize, objectFit: 'cover' }")
                  .q-pa-sm.text-caption.flex.flex-center.column.q-gutter-sm(v-else :style="{ width: galleryThumbSize, height: galleryThumbSize }")
                    q-icon(:name="getMimeIcon(item)" size="32px" color="grey-6")
                    span.text-center {{ item.label }}
                  div.absolute-full.flex.flex-center.bg-opacity-thumbnail.text-white(v-if="isSelected(item)")
                    q-icon(name="mdi-check-circle" size="24px")
          div(v-else-if="galleryLoading" class="row items-center justify-center q-gutter-sm q-py-xl")
            q-spinner(size="32px")
            span {{ appliedOptions.loadingLabel || 'Chargement…' }}
          div.text-negative.text-caption(v-else-if="galleryError") {{ galleryError }}
          div.text-grey.text-center.q-py-xl(v-else) Aucun élément dans la galerie

    //- Dialog de prévisualisation fullscreen
    file-preview(v-model="previewDialog" :item="previewItem")
</template>

<script lang="ts">
import { type ControlElement, type JsonFormsRendererRegistryEntry, rankWith, isStringControl, and, hasOption, or, isPrimitiveArrayControl } from '@jsonforms/core'
import { defineComponent, ref, computed } from 'vue'
import { rendererProps, type RendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { ControlWrapper, FilePreview } from '../common'
import { determineClearValue } from '../utils'
import { useMediaPickerControl } from '../composables'
import { QInput, QAvatar, QIcon, QBtn, QCard, QImg, QSpinner, QPopupProxy, QSeparator, QSpace, QChip, QBar } from 'quasar'
import { fileTypeFromBuffer } from 'file-type'
import mime from 'mime'

const controlRenderer = defineComponent({
  name: 'MediaPickerControl',
  components: {
    ControlWrapper,
    FilePreview,
    QInput,
    QAvatar,
    QIcon,
    QBtn,
    QCard,
    QImg,
    QSpinner,
    QPopupProxy,
    QSeparator,
    QSpace,
    QChip,
    QBar,
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
    const popup = ref<any>(null)
    const popupOpen = ref(false)
    const galleryDialog = ref(false)
    const previewDialog = ref(false)
    const previewItem = ref<any>(null)

    const getFileExtension = (url: string) => {
      if (!url || typeof url !== 'string') return ''
      const pathname = url.split('?')[0]
      const parts = pathname.split('.')
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
    }

    const getFileMimeType = (item: any) => {
      // Vérifier d'abord si le mime type est fourni
      if (item.mimeType) return item.mimeType.toLowerCase()
      if (item.type) return item.type.toLowerCase()

      // Sinon, deviner depuis l'extension avec la lib mime
      const src = item.thumbnail || item.value || ''
      const ext = getFileExtension(src)
      if (!ext) return ''

      return mime.getType(ext) || ''
    }

    const getMimeIcon = (item: any) => {
      if (!item) return 'mdi-file'
      const mime = getFileMimeType(item)

      // Images
      if (mime.startsWith('image/')) return 'mdi-image'

      // Documents
      if (mime === 'application/pdf') return 'mdi-file-pdf-box'
      if (mime.includes('word') || mime.includes('document')) return 'mdi-file-word-box'
      if (mime.includes('excel') || mime.includes('spreadsheet')) return 'mdi-file-excel-box'
      if (mime.includes('powerpoint') || mime.includes('presentation')) return 'mdi-file-powerpoint-box'

      // Archives
      if (mime.includes('zip') || mime.includes('rar') || mime.includes('7z') || mime.includes('tar') || mime.includes('gzip')) return 'mdi-folder-zip'

      // Vidéo
      if (mime.startsWith('video/')) return 'mdi-video-box'

      // Java
      if (mime.includes('java')) return 'mdi-language-java'

      // Audio
      if (mime.startsWith('audio/')) return 'mdi-music-box'

      // Code
      if (mime.includes('javascript') || mime.includes('typescript') || mime.includes('json')) return 'mdi-code-braces'
      if (mime.includes('html') || mime.includes('xml')) return 'mdi-xml'
      if (mime.includes('css')) return 'mdi-language-css3'

      // Texte
      if (mime.startsWith('text/')) return 'mdi-text-box'

      // Par défaut
      return 'mdi-file'
    }

    const isItemImage = (item: any) => {
      const mime = getFileMimeType(item)
      return mime.startsWith('image/')
    }

    const acceptAttr = computed(() => {
      const acc = api.mediaOptions.value.accept
      if (!acc) return undefined
      return Array.isArray(acc) ? acc.join(',') : acc
    })

    const isFileTypeAccepted = async (file: File, acceptPattern: string): Promise<boolean> => {
      // Lire les premiers octets du fichier pour détecter le véritable type
      const buffer = await file.slice(0, 4100).arrayBuffer()
      const uint8Array = new Uint8Array(buffer)
      const detectedType = await fileTypeFromBuffer(uint8Array)

      const detectedMime = detectedType?.mime?.toLowerCase() || ''

      // Si acceptPattern est une wildcard comme "image/*"
      if (acceptPattern.includes('/*')) {
        const baseType = acceptPattern.split('/')[0]

        // Vérifier le type MIME détecté
        if (detectedMime && detectedMime.startsWith(baseType + '/')) {
          return true
        }

        // Si pas de type détecté, rejeter (plus sécurisé)
        return false
      }

      // Si c'est un type MIME spécifique
      if (acceptPattern.includes('/')) {
        // Vérifier le type MIME détecté
        if (detectedMime === acceptPattern.toLowerCase()) {
          return true
        }

        // Si pas de type détecté, rejeter
        return false
      }

      // Si c'est une extension de fichier
      if (acceptPattern.startsWith('.')) {
        return file.name.toLowerCase().endsWith(acceptPattern.toLowerCase())
      }

      return false
    }

    const onFilesChosen = async (e: Event) => {
      const target = e.target as any
      const filesAny = target.files ? Array.from(target.files) : []
      const files = (filesAny as any[]).filter((f) => f && typeof f === 'object') as File[]
      if (!files.length) return

      // Validation des types de fichiers
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
          if (isValid) {
            validFiles.push(file)
          } else {
            invalidFiles.push(file.name)
          }
        }

        if (invalidFiles.length > 0) {
          const acceptStr = acceptPatterns.join(', ')
          ;(globalThis as any).alert?.(`Les fichiers suivants ne sont pas acceptés (types autorisés: ${acceptStr}):\n${invalidFiles.join('\n')}`)
        }

        if (!validFiles.length) {
          if (fileInput.value) fileInput.value.value = ''
          return
        }

        const uploaded = await api.uploadFiles(validFiles)
        if (uploaded.length && api.mediaOptions.value.autoSelectUploaded !== false) {
          const items = api.mapRawItemsToOptions(uploaded)
          api.addSelection(items as any)
        }
      } else {
        // Pas de restriction
        const uploaded = await api.uploadFiles(files)
        if (uploaded.length && api.mediaOptions.value.autoSelectUploaded !== false) {
          const items = api.mapRawItemsToOptions(uploaded)
          api.addSelection(items as any)
        }
      }

      if (fileInput.value) fileInput.value.value = ''
    }

    const displayValue = computed(() => {
      if (!api.selectedItems.value.length) return ''
      if (api.multiple.value) return `${api.selectedItems.value.length} élément(s) sélectionné(s)`
      const sel = api.selectedItems.value[0]
      const pref = (api.appliedOptions.value as any)?.displayValueFrom || 'label' // 'label' | 'value' | 'thumbnail'
      if (pref === 'value' && (typeof sel.value === 'string' || typeof sel.value === 'number')) {
        return String(sel.value)
      }
      // Pour 'thumbnail', on affiche l'aperçu dans le prepend (avatar), pas le texte URL
      if (pref === 'thumbnail') return ''
      return sel.label
    })

    const displayPreviewSrc = computed(() => {
      if (api.multiple.value || !api.selectedItems.value.length) return ''
      const sel = api.selectedItems.value[0]
      if (typeof sel.thumbnail === 'string' && sel.thumbnail) return sel.thumbnail
      if (typeof sel.value === 'string') return sel.value
      return ''
    })

    const isFieldReadonly = computed(() => {
      const optRo = (api.appliedOptions.value as any)?.readonly
      const schemaRo = (api.control.value as any)?.schema?.readOnly
      // si l'API expose isReadonly, on l'honore aussi
      const apiRo = (api as any).isReadonly?.value
      return Boolean(optRo || schemaRo || apiRo)
    })

    const hasModelValue = computed(() => {
      const modelValue = api.control.value.data
      return modelValue != null && modelValue !== ''
    })

    const openGallery = async () => {
      // Désactivé si control désactivé
      // if (!(api as any).control?.enabled) return

      // Si pas de galleryMode, ne rien faire
      if (!galleryMode.value) return

      await api.fetchGallery()

      if (galleryMode.value === 'popup') {
        popupOpen.value = true
      } else if (galleryMode.value === 'dialog') {
        galleryDialog.value = true
      }
    }

    const onInputClick = (e?: Event) => {
      // Si disabled, ne rien faire
      // if (!(api as any).control?.enabled) {
      //   return
      // }

      // Si readonly (schema), ne rien faire
      if (isFieldReadonly.value) {
        return
      }

      // Ouvrir la galerie seulement si galleryMode est défini
      if (galleryMode.value) {
        e?.preventDefault?.()
        e?.stopPropagation?.()
        // Éviter que le focus reste sur un élément qui sera masqué (aria-hidden)
        const ae = (globalThis as any).document?.activeElement as any
        ae?.blur?.()
        if (galleryMode.value === 'popup') {
          // Toggle: si ouvert -> fermer, sinon ouvrir
          if (popupOpen.value) {
            closeGallery()
          } else {
            openGallery()
          }
        } else {
          openGallery()
        }
      } else {
        // Si galleryMode est null: en multiple -> ouvrir l'upload; en single -> preview si valeur existe, sinon upload
        e?.preventDefault?.()
        e?.stopPropagation?.()
        const ae = (globalThis as any).document?.activeElement as any
        ae?.blur?.()
        if (api.multiple.value) {
          onUploadClick()
        } else {
          const modelValue = api.control.value.data
          const hasValue = modelValue != null && modelValue !== '' && api.selectedItems.value.length > 0
          if (hasValue) {
            showPreview(api.selectedItems.value[0])
          } else {
            onUploadClick()
          }
        }
      }
    }

    const closeGallery = () => {
      popup.value?.hide?.()
      popupOpen.value = false
      galleryDialog.value = false
    }

    const onUploadClick = () => {
      // Ferme la popup si ouverte puis déclenche l'input file
      closeGallery()
      const ae = (globalThis as any).document?.activeElement as any
      ae?.blur?.()
      const el = fileInput.value as any
      if (el && typeof el.click === 'function') el.click()
    }

    const displayMode = computed(() => (api.appliedOptions.value as any)?.displayMode || 'simple')

    const galleryMode = computed(() => (api.appliedOptions.value as any)?.galleryMode || null)

    const galleryThumbSize = computed(() => {
      const media = (api.mediaOptions.value as any) || {}
      let s: any = media.thumbSize ?? media.galleryThumbSize ?? 96
      if (typeof s === 'string') {
        const parsed = parseInt(s, 10)
        if (!Number.isNaN(parsed)) s = parsed
      }
      return typeof s === 'number' ? `${s}px` : String(s)
    })

    const previewMaxHeight = computed(() => {
      const media = (api.mediaOptions.value as any) || {}
      let h: any = media.previewMaxHeight ?? 320
      if (typeof h === 'string') {
        const parsed = parseInt(h, 10)
        if (!Number.isNaN(parsed)) h = parsed
      }
      return typeof h === 'number' ? `${h}px` : String(h)
    })

    const onPopupBeforeShow = () => {
      // sécurité: refetch dès l'ouverture de la popup
      void api.fetchGallery()
    }

    // En mode multiple, le clic sur l'input ouvre directement l'upload; pas de téléchargement automatique.

    const showPreview = (item: any) => {
      previewItem.value = item
      previewDialog.value = true
    }

    const isItemTypeAccepted = (item: any) => {
      const acc = api.mediaOptions.value.accept
      if (!acc) return true // Pas de restriction

      const acceptPatterns = Array.isArray(acc) ? acc : acc.split(',').map((s: string) => s.trim())
      const detectedMime = getFileMimeType(item)

      return acceptPatterns.some((pattern: string) => {
        // Wildcard comme "image/*"
        if (pattern.includes('/*')) {
          const baseType = pattern.split('/')[0]

          // Vérifier le mime type détecté
          if (detectedMime && typeof detectedMime === 'string' && detectedMime.startsWith(baseType + '/')) {
            return true
          }

          return false
        }

        // Type MIME spécifique
        if (pattern.includes('/')) {
          // Vérifier si le mime type correspond
          if (detectedMime && typeof detectedMime === 'string' && detectedMime === pattern.toLowerCase()) {
            return true
          }

          return false
        }

        // Extension de fichier
        if (pattern.startsWith('.')) {
          const src = item.thumbnail || item.value || item.label || ''
          const ext = getFileExtension(src)
          return ext && pattern.toLowerCase() === `.${ext}`
        }

        return false
      })
    }

    const onGalleryItemClick = (item: any) => {
      // ignore si déjà sélectionné
      if (api.isSelected(item)) return

      // Vérification du type de fichier
      if (!isItemTypeAccepted(item)) {
        const acc = api.mediaOptions.value.accept
        const acceptStr = Array.isArray(acc) ? acc.join(', ') : acc
        ;(globalThis as any).alert?.(`Ce type de fichier n'est pas accepté.\nTypes autorisés: ${acceptStr}`)
        return
      }

      api.addSelection(item as any)
      // en single-selection, on ferme la popup après choix
      if (!api.multiple.value) {
        closeGallery()
      }
    }

    // Options d'affichage via appliedOptions
    const enableZoomCursor = computed(() => {
      const opt = (api.appliedOptions.value as any) || {}
      // par défaut: true; désactivable avec zoomCursor: false
      return opt.zoomCursor !== false
    })

    const showEyeOverlay = computed(() => {
      const opt = (api.appliedOptions.value as any) || {}
      // par défaut: true; désactivable avec previewEye: false
      return opt.previewEye !== false
    })

    return {
      ...api,
      fileInput,
      acceptAttr,
      onFilesChosen,
      displayValue,
      displayPreviewSrc,
      popup,
      popupOpen,
      galleryDialog,
      galleryMode,
      openGallery,
      onInputClick,
      closeGallery,
      onUploadClick,
      displayMode,
      galleryThumbSize,
      previewMaxHeight,
      isFieldReadonly,
      hasModelValue,
      onPopupBeforeShow,
      showPreview,
      onGalleryItemClick,
      enableZoomCursor,
      showEyeOverlay,
      previewDialog,
      previewItem,
      getMimeIcon,
      isItemImage,
    }
  },
})

export default controlRenderer

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  // prettier-ignore
  tester: rankWith(2,
    and(
      or(
        isStringControl,
        isPrimitiveArrayControl,
      ),
      hasOption('media'),
    ),
  ), // Matches string or primitive array controls with 'media' option defined
}
</script>

<style lang="scss" scoped>
.hidden {
  display: none;
}
// Affichage d'actions uniquement au survol
.hover-parent {
  position: relative;
}
.hover-show {
  opacity: 0;
  //pointer-events: none;
  transition: opacity 0.15s ease;
}
.hover-parent:hover .hover-show {
  opacity: 1;
  pointer-events: auto;
}
// Bordure sur les images
.img-bordered {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
}

// Overlay semi-transparent unifié pour les thumbnails
.bg-opacity-thumbnail {
  background-color: rgba(0, 0, 0, 0.4);
}
</style>
