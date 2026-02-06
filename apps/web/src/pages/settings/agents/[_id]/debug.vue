<template lang="pug">
  .column.no-wrap.full-height
    q-bar.q-pr-none.bg-transparent
      q-toolbar-title Panneau de debuggage
    q-separator
    client-only
      MonacoEditor.fit(
        :model-value='JSON.stringify(data.agent, null, 2)'
        :options='monacoOptions'
        lang='json'
      )
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'

type Agent = components['schemas']['AgentsDto']

export default defineNuxtComponent({
  name: 'SettingsAgentsIdDebugPage',
  props: {
    data: {
      type: Object as () => { agent: Agent },
      required: true,
    },
  },
  computed: {
    monacoOptions() {
      return {
        theme: this.$q.dark.isActive ? 'vs-dark' : 'vs-light',
        readOnly: true,
        minimap: {
          enabled: true,
        },
      }
    },
  },
})
</script>
