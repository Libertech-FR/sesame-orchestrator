<template lang="pug">
  q-footer(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" bordered)
    q-bar(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-black'")
      a(
        :href="'https://github.com/Libertech-FR/sesame-orchestrator/releases/tag/' + (orchestratorVersion?.currentVersion || '0.0.0')"
        target="_blank"
        rel="noopener noreferrer"
        style="color: inherit; text-decoration: none;"
      )
        small.gt-xs Orchestrator&nbsp;
        small(v-text="'v' + (orchestratorVersion?.currentVersion || '0.0.0')")
      small.bold &nbsp;/&nbsp;
      a(
        :href="'https://github.com/Libertech-FR/sesame-daemon/releases/tag/' + (daemonVersion?.currentVersion || '0.0.0')"
        target="_blank"
        rel="noopener noreferrer"
        style="color: inherit; text-decoration: none;"
      )
        small.gt-xs Daemon&nbsp;
        small(v-text="'v' + (daemonVersion?.currentVersion || '0.0.0')")
      div.q-pr-xs
      q-btn.q-px-xs(
        v-show="orchestratorVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-orchestrator/releases" target="_blank"
      ) Orchestrator
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="orchestratorVersion?.lastVersion || '0.0.0'")
          | )
      q-btn.q-px-xs(
        v-show="daemonVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-daemon/releases" target="_blank"
      ) Daemon
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="daemonVersion?.lastVersion || '0.0.0'")
          | )
      q-space
      sesame-core-help-buttons
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'LayoutsDefaultFooterComponent',
  inject: ['orchestratorVersion', 'daemonVersion'],
  setup() {
    const orchestratorVersion = inject('orchestratorVersion')
    const daemonVersion = inject('daemonVersion')

    return {
      orchestratorVersion,
      daemonVersion,
    }
  },
})
</script>
