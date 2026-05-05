<template lang="pug">
  control-wrapper(
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
    v-model:is-hovered="isHovered"
  )
    .network-list-field(:class="styles.control.input")
      .text-caption.text-weight-medium.text-grey-7.q-mb-xs {{ addFieldLabel }}
      .row.q-col-gutter-sm.items-start
        q-input.col(
          v-model="draft"
          dense
          :hide-bottom-space="localError === ''"
          outlined
          :placeholder="appliedOptions.placeholder || 'Saisir une adresse, un CIDR ou une plage…'"
          :disable="!canEdit"
          :readonly="isReadonly"
          :error="localError !== ''"
          :error-message="localError"
          @keyup.enter="addEntry"
          @update:model-value="localError = ''"
          :id="elementId + '-draft'"
          v-bind="quasarProps('q-input')"
        )
          template(#prepend)
            q-icon(name="mdi-ip-network-outline" color="grey-6" size="sm")
        .col-auto
          q-btn.network-list-add-btn(
            color="primary"
            icon="mdi-plus"
            :label="addButtonLabel"
            no-caps
            padding="sm md"
            unelevated
            :disable="!canEdit || draftTrimmed === ''"
            @click="addEntry"
          )

      .network-list-empty.text-caption.text-grey-6.q-mt-sm(v-if="items.length === 0")
        q-icon.q-mr-xs(name="mdi-information-outline" size="16px")
        | {{ emptyMessage }}

      .network-list-chips.row.q-col-gutter-sm.q-mt-sm(v-else)
        .col-auto(
          v-for="(item, index) in items"
          :key="`${index}-${item}`"
        )
          q-chip.network-list-chip(
            dense
            removable
            :disable="!canEdit"
            :tabindex="-1"
            icon="mdi-ip-network"
            @remove="removeAt(index)"
          )
            span.network-list-chip-label {{ item }}

      .text-caption.text-grey-6.q-mt-sm.network-list-desc(v-if="control.description") {{ control.description }}
      q-banner.network-list-banner-error.text-negative.q-mt-sm(
        v-if="control.errors"
        dense
        inline-actions
        rounded
      )
        template(#avatar)
          q-icon(name="mdi-alert-circle-outline" color="negative")
        | {{ control.errors }}
</template>

<script lang="ts">
import type { ControlElement } from '@jsonforms/core'
import { rendererProps, type RendererProps, useJsonFormsEnumControl } from '@jsonforms/vue'
import { QBanner, QBtn, QChip, QIcon, QInput } from 'quasar'
import { computed, defineComponent, ref } from 'vue'
import { ControlWrapper } from '../common'
import { createEnumAdaptTarget } from '../composables'
import { useQuasarControl } from '../utils'

const toStringList = (data: unknown): string[] => {
  if (!Array.isArray(data)) return []
  return data.filter((x): x is string => typeof x === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
}

const dedupePreserveOrder = (list: string[]): string[] => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of list) {
    if (seen.has(s)) continue
    seen.add(s)
    out.push(s)
  }
  return out
}

/** CIDR ou adresse IPv4, ou plage a.b.c.d-e.f.g.h (aligné usage backend ipRangeCheck) */
const IPV4_OR_CIDR = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/
const IPV4_RANGE = /^(\d{1,3}\.){3}\d{1,3}-(\d{1,3}\.){3}\d{1,3}$/

const validateStrictRule = (raw: string): boolean => {
  const s = raw.trim()
  if (s.length === 0) return false
  return IPV4_OR_CIDR.test(s) || IPV4_RANGE.test(s)
}

export default defineComponent({
  name: 'NetworkListControlRenderer',
  components: {
    ControlWrapper,
    QBanner,
    QChip,
    QIcon,
    QBtn,
    QInput,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const jsonFormsControl = useJsonFormsEnumControl(props)
    const adaptTarget = createEnumAdaptTarget([])
    const api = useQuasarControl(jsonFormsControl, adaptTarget, 0)

    const draft = ref('')
    const localError = ref('')

    const items = computed(() => dedupePreserveOrder(toStringList(api.control.value.data)))

    const canEdit = computed(() => api.control.value.enabled && !api.isReadonly.value)

    const draftTrimmed = computed(() => draft.value.trim())

    const strictSyntax = computed(() => api.appliedOptions.value?.strictNetworkSyntax === true)

    const emptyMessage = computed(
      () =>
        (api.appliedOptions.value?.emptyHint as string | undefined) ||
        'Aucune restriction : toutes les adresses IP sont autorisées.',
    )

    const addFieldLabel = computed(() => (api.appliedOptions.value?.addFieldLabel as string | undefined) || 'Nouvelle règle réseau')

    const addButtonLabel = computed(() => (api.appliedOptions.value?.addButtonLabel as string | undefined) || 'Ajouter')

    const addEntry = () => {
      localError.value = ''
      const next = draftTrimmed.value
      if (next === '') {
        return
      }
      if (strictSyntax.value && !validateStrictRule(next)) {
        localError.value =
          'Format attendu : adresse IPv4 (ex. 192.168.1.1), CIDR (ex. 10.0.0.0/24) ou plage (ex. 10.0.0.1-10.0.0.5).'
        return
      }
      const current = toStringList(api.control.value.data)
      if (current.includes(next)) {
        localError.value = 'Cette entrée est déjà présente.'
        return
      }
      api.onChange(adaptTarget([...current, next]))
      draft.value = ''
    }

    const removeAt = (index: number) => {
      const current = items.value
      const next = current.filter((_, i) => i !== index)
      api.onChange(adaptTarget(next))
    }

    return {
      ...api,
      draft,
      localError,
      draftTrimmed,
      items,
      canEdit,
      emptyMessage,
      addFieldLabel,
      addButtonLabel,
      addEntry,
      removeAt,
    }
  },
})
</script>

<style scoped lang="scss">
.network-list-field {
  width: 100%;
}

.network-list-chip {
  max-width: 100%;
}

.network-list-chip-label {
  font-family: ui-monospace, 'Cascadia Code', 'SF Mono', Menlo, monospace;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
}

.network-list-desc {
  line-height: 1.45;
}

.network-list-banner-error {
  border: 1px solid rgba(193, 0, 21, 0.35);
  background: rgba(193, 0, 21, 0.08);
}

.body--dark .network-list-banner-error {
  border-color: rgba(255, 82, 82, 0.45);
  background: rgba(255, 82, 82, 0.12);
}

.network-list-add-btn {
  min-height: 40px;
}
</style>
