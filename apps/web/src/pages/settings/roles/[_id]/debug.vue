<template lang="pug">
  .column.no-wrap.full-height
    q-bar.q-pr-none.bg-transparent
      q-toolbar-title Panneau de debuggage
    q-separator
    client-only
      MonacoEditor.fit(
        :model-value='JSON.stringify(data.role, null, 2)'
        :options='monacoOptions'
        lang='json'
      )
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'

type Role = components['schemas']['RolesDto']

export default defineNuxtComponent({
  name: 'SettingsRolesIdDebugPage',
  props: {
    data: {
      type: Object as () => { role: Role },
      required: true,
    },
  },
  setup() {
    const { monacoOptions } = useDebug()
    return {
      monacoOptions,
    }
  },
})
</script>
