<template lang="pug">
  .column.no-wrap.full-height
    q-bar.q-pr-none.bg-transparent
      q-toolbar-title Panneau de debuggage
      q-space
      q-btn-group(flat)
        q-btn(icon='mdi-format-list-checkbox' stretch flat @click='crushed = false' :color='!crushed ? "orange-8" : "default"')
          q-tooltip.text-body2(:delay="200") Afficher la version complète de l'identité
        q-btn(icon='mdi-format-list-text' stretch flat @click='crushed = true' :color='crushed ? "orange-8" : "default"')
          q-tooltip.text-body2(:delay="200") Afficher la version aplatie et écrasée de l'identité
    q-separator
    client-only
      MonacoEditor.fit(
        :model-value='JSON.stringify(crushedIdentity, null, 2)'
        :options='monacoOptions'
        lang='json'
      )
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesIdDebugPage',
  props: {
    identity: Object,
  },
  data() {
    return {
      crushed: true,
    }
  },
  setup() {
    const { toPlainAndCrush } = useIdentityUtils()
    const { monacoOptions } = useDebug()

    return { toPlainAndCrush, monacoOptions }
  },
  computed: {
    crushedIdentity(): Record<string, any> {
      if (this.crushed) {
        return this.toPlainAndCrush(this.identity as Record<string, any>)
      }
      return this.identity as Record<string, any>
    },
  },
})
</script>
