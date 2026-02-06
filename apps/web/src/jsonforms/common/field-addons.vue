<template lang="pug">
//- Renders a list of icons for a given position (prepend/append/before/after)
//- Designed to be placed inside Quasar field/input/select slots
span.q-field-addon-icons.flex.items-center(v-if="hasItems")
  span.flex.items-center(v-for="(item, index) in normalizedItems" :key="item.key")
    q-icon(
      :name="item.icon"
      :color="item.color"
      :size="item.size || defaultSize"
      :class="iconClasses(item)"
      :style="item.style"
      :disable="item.disabled"
      :aria-label="item.tooltip"
      :tabindex="item.clickable && !item.disabled ? 0 : -1"
      @click="onClick(item, index)"
      @keydown.enter.space.prevent="onClick(item, index)"
    )
      q-tooltip(v-if="item.tooltip") {{ item.tooltip }}
</template>

<script lang="ts">
import { defineComponent, computed, type PropType } from 'vue'
import { QIcon, QTooltip } from 'quasar'

export type AddonIconItem = {
  icon: string
  tooltip?: string
  color?: string
  size?: string
  class?: string | string[] | Record<string, boolean>
  style?: Record<string, string | number>
  disabled?: boolean
  clickable?: boolean
  id?: string
}

export default defineComponent({
  name: 'FieldAddons',
  components: { QIcon, QTooltip },
  props: {
    // Icons to render
    items: {
      type: Array as PropType<AddonIconItem[] | undefined>,
      required: false,
      default: undefined,
    },
    // Slot position in parent (for payload and analytics)
    position: {
      type: String as PropType<'prepend' | 'append' | 'before' | 'after'>,
      required: true,
    },
    // Useful to identify the control emitting the event
    controlId: {
      type: String,
      required: false,
      default: undefined,
    },
    defaultSize: {
      type: String,
      required: false,
      default: '18px',
    },
  },
  emits: ['icon-click'],
  setup(props, { emit }) {
    const normalizedItems = computed(() =>
      (props.items || []).filter(Boolean).map((it, idx) => ({
        key: it.id ?? `${props.position}-${idx}`,
        clickable: true,
        disabled: false,
        ...it,
      })),
    )

    const hasItems = computed(() => normalizedItems.value.length > 0)

    function iconClasses(item: Required<AddonIconItem>) {
      return ['q-mx-xs', item.clickable && !item.disabled ? 'cursor-pointer' : 'cursor-default', item.disabled ? 'opacity-50 no-pointer-events' : '', item.class || '']
    }

    function onClick(item: Required<AddonIconItem>, index: number) {
      if (item.disabled || !item.clickable) return
      emit('icon-click', {
        position: props.position,
        index,
        item,
        controlId: props.controlId,
      })
    }

    return {
      normalizedItems,
      hasItems,
      onClick,
      iconClasses,
    }
  },
})
</script>

<style scoped>
.q-field-addon-icons :deep(.q-tooltip) {
  white-space: nowrap;
}
.no-pointer-events {
  pointer-events: none;
}
</style>
