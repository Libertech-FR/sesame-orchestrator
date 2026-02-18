<template lang="pug">
  q-expansion-item(
    v-if="layout.visible"
    :label="layout.uischema.label || 'Group'"
    header-class="bg-primary text-white"
    default-opened
  )
    .q-pa-md
      div(
        v-for="(element, index) in layout.uischema.elements"
        :key="`${layout.path}-${index}`"
      )
        dispatch-renderer(
          :schema="layout.schema"
          :uischema="element"
          :path="layout.path"
          :enabled="layout.enabled"
          :renderers="layout.renderers"
          :cells="layout.cells"
        )
</template>

<script lang="ts">
import { type Layout } from '@jsonforms/core'
import { defineComponent } from 'vue'
import { DispatchRenderer, rendererProps, useJsonFormsLayout, type RendererProps } from '@jsonforms/vue'
import { useQuasarLayout } from '../utils'

/**
 * GroupLayout Renderer Component
 *
 * A Vue 3 component that renders custom JSONForms "Group" layout elements using Quasar's expansion item.
 */
const groupLayoutRenderer = defineComponent({
  name: 'GroupLayoutRenderer',
  components: {
    DispatchRenderer,
  },
  props: {
    ...rendererProps<Layout>(),
  },
  setup(props: RendererProps<Layout>) {
    return useQuasarLayout(useJsonFormsLayout(props))
  },
})

export default groupLayoutRenderer
</script>
