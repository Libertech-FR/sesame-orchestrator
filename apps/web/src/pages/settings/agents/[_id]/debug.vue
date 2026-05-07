<template lang="pug">
  .column.no-wrap.full-height
    q-bar.q-pr-none.bg-transparent
      q-toolbar-title Panneau de debuggage
    q-separator
    client-only
      LazyMonacoEditor.fit(
        :model-value='JSON.stringify(maskedAgent, null, 2)'
        :options='monacoOptions'
        lang='json'
      )
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'

type Agent = components['schemas']['AgentsDto']

const MASKED_VALUE = '***'

function maskSensitiveAgentValue(value: unknown, depth = 0): unknown {
  if (value == null) return value
  if (depth > 12) return '[truncated]'

  if (Array.isArray(value)) {
    return value.map((v) => maskSensitiveAgentValue(v, depth + 1))
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}

    for (const [key, v] of Object.entries(obj)) {
      const lowered = key.toLowerCase()
      if (['password', 'oldpasswords', 'u2fkey', 'otpkey', 'secretkey'].includes(lowered)) {
        out[key] = MASKED_VALUE
        continue
      }
      out[key] = maskSensitiveAgentValue(v, depth + 1)
    }

    return out
  }

  return value
}

export default defineNuxtComponent({
  name: 'SettingsAgentsIdDebugPage',
  props: {
    data: {
      type: Object as () => { agent: Agent },
      required: true,
    },
  },
  setup(props) {
    const { monacoOptions } = useDebug()
    const maskedAgent = computed(() => maskSensitiveAgentValue(props.data?.agent))
    return {
      monacoOptions,
      maskedAgent,
    }
  },
})
</script>
