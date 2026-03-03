<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    v-model:is-hovered="isHovered"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  )
    .photo-control.q-mb-md(:class="styles.control.input")
      .text-caption.text-grey-8.q-mb-xs(v-if="computedLabel") {{ computedLabel }}
      q-img(
        v-if="photoUrl && !hasError"
        :src="photoUrl"
        :ratio="1"
        fit="contain"
        spinner-color="primary"
        class="photo-control__image"
        :height="appliedOptions.height || '400px'"
        @error="onImageError"
      )
        template(#error)
          .photo-control__placeholder
            q-icon(name="mdi-account" size="48px" color="grey-6")
            span.text-caption.text-grey-7 Photo indisponible
      .photo-control__placeholder(v-else)
        q-icon(name="mdi-account" size="48px" color="grey-6")
        span.text-caption.text-grey-7 Aucune photo
      .text-caption.text-negative.q-mt-xs(v-if="control.errors") {{ control.errors }}
</template>

<script lang="ts">
import { type ControlElement } from '@jsonforms/core'
import { defineComponent, computed, ref, watch } from 'vue'
import { rendererProps, type RendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { QImg, QIcon } from 'quasar'
import { isArray } from 'radash'
import { ControlWrapper } from '../common'
import { determineClearValue, useJsonForms, useQuasarControl } from '../utils'

const controlRenderer = defineComponent({
  name: 'PhotoControlRenderer',
  components: {
    ControlWrapper,
    QImg,
    QIcon,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsControl(props)
    const clearValue = determineClearValue(undefined)
    const api = useQuasarControl(jsonFormsControl, (value) => value ?? clearValue, 100)
    const jsonforms = useJsonForms()
    const auth = useAuth()

    const hasError = ref(false)

    const employeeNumber = computed(() => {
      const value = (jsonforms as any)?.core?.data?.employeeNumber
      if (isArray(value)) return value[0]
      return value
    })

    const employeeType = computed(() => {
      const value = (jsonforms as any)?.core?.data?.employeeType
      if (isArray(value)) return value[0]
      return value
    })

    const photoUrl = computed(() => {
      const query = new URLSearchParams()
      const employeeNumberValue = employeeNumber.value
      const employeeTypeValue = employeeType.value

      if (!employeeNumberValue || !employeeTypeValue) return ''
      if (!auth.user?._id || !auth.user?.sseToken) return ''

      query.append('filters[:inetOrgPerson.employeeNumber]', `${employeeNumberValue}`)
      query.append('filters[:inetOrgPerson.employeeType]', `${employeeTypeValue}`)
      query.append('id', `${auth.user._id}`)
      query.append('key', `${auth.user.sseToken}`)

      return `/api/management/identities/photo/raw?${query.toString()}`
    })

    watch(photoUrl, () => {
      hasError.value = false
    })

    const onImageError = () => {
      hasError.value = true
    }

    return {
      ...api,
      photoUrl,
      hasError,
      onImageError,
    }
  },
})

export default controlRenderer
</script>

<style lang="scss" scoped>
.photo-control {
  width: 100%;
  max-width: none;
}

.photo-control__image {
  width: 100%;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

.photo-control__placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  min-height: 180px;
  border-radius: 8px;
  border: 1px dashed rgba(0, 0, 0, 0.2);
  background: rgba(0, 0, 0, 0.03);
}
</style>
