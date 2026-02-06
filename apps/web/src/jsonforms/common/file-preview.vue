<template lang="pug">
q-dialog(
  :model-value="modelValue"
  @update:model-value="$emit('update:modelValue', $event)"
  maximized
  transition-show="slide-up"
  transition-hide="slide-down"
  @hide="onHide"
)
  .bg-black.text-white.fit.column
    q-bar(class="bg-grey-9")
      q-space
      span.text-subtitle2(v-if="item") {{ getItemLabel(item) }}
      q-space
      q-btn(dense flat icon="mdi-close" @click="close")
        q-tooltip Fermer
    .col.flex.flex-center.q-pa-none(v-if="item")
      //- Image
      q-img(
        v-if="isImage"
        :src="previewSrc"
        fit="contain"
        style="max-width: 100%; max-height: 100%;"
      )
      //- PDF
      iframe(
        v-else-if="isPdf"
        :src="previewSrc"
        style="width: 100%; height: 100%; border: none;"
      )
      //- Vidéo
      video(
        v-else-if="isVideo"
        :src="previewSrc"
        controls
        style="max-width: 100%; max-height: 100%;"
      )
      //- Audio
      audio(
        v-else-if="isAudio"
        :src="previewSrc"
        controls
        class="q-ma-md"
      )
      //- Autre: afficher le lien
      div(v-else class="column items-center q-gutter-md")
        q-icon(name="mdi-file" size="64px")
        span.text-h6 {{ getItemLabel(item) }}
        q-btn(
          outline
          color="white"
          label="Ouvrir dans un nouvel onglet"
          icon="mdi-open-in-new"
          :href="previewSrc"
          target="_blank"
        )
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch, type PropType } from 'vue'
import { QDialog, QBar, QBtn, QImg, QIcon } from 'quasar'
import mime from 'mime'

export default defineComponent({
  name: 'FilePreview',
  components: {
    QDialog,
    QBar,
    QBtn,
    QImg,
    QIcon,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    item: {
      type: Object as PropType<any>,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const lastObjectUrl = ref<string | null>(null)

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

    const isDataUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:')

    const dataUrlToObjectUrl = (dataUrl: string): string => {
      try {
        const [header, base64] = dataUrl.split(',')
        const mimeMatch = /data:([^;]+);base64/.exec(header)
        const mimeType = mimeMatch?.[1] || 'application/octet-stream'
        const bin = (globalThis as any).atob?.(base64 || '') || ''
        const len = bin.length
        const buf = new Uint8Array(len)
        for (let i = 0; i < len; i++) buf[i] = bin.charCodeAt(i)
        const blob = new Blob([buf], { type: mimeType })
        const url = (globalThis as any).URL?.createObjectURL?.(blob)
        return typeof url === 'string' ? url : ''
      } catch {
        return ''
      }
    }

    const buildPreviewSrc = (item: any) => {
      if (!item) return ''
      let v = item.thumbnail || item.value || ''

      // Si value est un objet avec data (format base64: { type, name, data })
      if (v && typeof v === 'object' && v.data) {
        v = v.data
      }

      // File -> object URL
      if (typeof (globalThis as any).File !== 'undefined' && v instanceof (globalThis as any).File) {
        // Revoke previous URL to avoid leaks
        if (lastObjectUrl.value) {
          try {
            ;(globalThis as any).URL?.revokeObjectURL?.(lastObjectUrl.value)
          } catch {}
          lastObjectUrl.value = null
        }
        try {
          const url = (globalThis as any).URL?.createObjectURL?.(v)
          if (typeof url === 'string') {
            lastObjectUrl.value = url
            return url
          }
        } catch {}
        return ''
      }

      // data URL -> convert to object URL for performance
      if (isDataUrl(v)) {
        const url = dataUrlToObjectUrl(v)
        return url || v
      }

      // String URL
      if (typeof v === 'string') return v
      return ''
    }

    const previewSrc = computed(() => buildPreviewSrc(props.item))

    const mimeType = computed(() => getFileMimeType(props.item))

    const isImage = computed(() => {
      const mt = mimeType.value
      return !!mt && mt.startsWith('image/')
    })

    const isPdf = computed(() => {
      const mt = mimeType.value
      return mt === 'application/pdf'
    })

    const isVideo = computed(() => {
      const mt = mimeType.value
      return !!mt && mt.startsWith('video/')
    })

    const isAudio = computed(() => {
      const mt = mimeType.value
      return !!mt && mt.startsWith('audio/')
    })

    const getItemLabel = (item: any) => {
      if (!item) return ''

      // Si la value est un objet base64 avec name, utiliser name comme label
      if (item.value && typeof item.value === 'object' && item.value.name) {
        return item.value.name
      }

      const label = item.label || ''
      // Si le label est un data URL ou base64, ne pas l'afficher
      if (typeof label === 'string' && (label.startsWith('data:') || label.length > 100)) {
        return 'Aperçu du fichier'
      }
      return label || 'Aperçu du fichier'
    }

    const close = () => {
      emit('update:modelValue', false)
    }

    const onHide = () => {
      // Cleanup object URLs when dialog closes
      setTimeout(() => {
        if (lastObjectUrl.value) {
          try {
            ;(globalThis as any).URL?.revokeObjectURL?.(lastObjectUrl.value)
          } catch {}
          lastObjectUrl.value = null
        }
      }, 300)
    }

    // Watch for item changes to cleanup old URLs
    watch(
      () => props.item,
      (newItem, oldItem) => {
        if (newItem !== oldItem && lastObjectUrl.value) {
          try {
            ;(globalThis as any).URL?.revokeObjectURL?.(lastObjectUrl.value)
          } catch {}
          lastObjectUrl.value = null
        }
      },
    )

    return {
      previewSrc,
      isImage,
      isPdf,
      isVideo,
      isAudio,
      getItemLabel,
      close,
      onHide,
    }
  },
})
</script>
