<template lang="pug">
  q-footer(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" bordered)
    q-bar(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-black'")
      a(
        :href="orchestratorVersion?.currentVersion ? 'https://github.com/Libertech-FR/sesame-orchestrator/releases/tag/' + orchestratorVersion?.currentVersion : 'javascript:void(0)'"
        :target="orchestratorVersion?.currentVersion ? '_blank' : undefined"
        rel="noopener noreferrer"
        style="color: inherit; text-decoration: none;"
      )
        q-tooltip.text-body2(
          v-if="orchestratorVersion?.currentVersion"
          anchor="top middle"
          self="bottom middle"
        )
          | Version d’Orchestrator actuellement installée : {{ orchestratorVersion?.currentVersion ? ('v' + orchestratorVersion?.currentVersion) : 'N/A' }}.
          br
          small.text-caption Cliquez pour ouvrir la page de version et consulter les notes de publication.
        small.gt-xs Orchestrator&nbsp;
        small.text-grey-7(v-text="orchestratorVersion?.currentVersion ? ('v' + orchestratorVersion?.currentVersion) : 'N/A'")
      q-separator.q-mx-sm(vertical inset style="width: 2px;")
      a(
        :href="daemonVersion?.currentVersion ? 'https://github.com/Libertech-FR/sesame-daemon/releases/tag/' + daemonVersion?.currentVersion : 'javascript:void(0)'"
        :target="daemonVersion?.currentVersion ? '_blank' : undefined"
        rel="noopener noreferrer"
        style="color: inherit; text-decoration: none;"
      )
        q-tooltip.text-body2(
          v-if="daemonVersion?.currentVersion"
          anchor="top middle"
          self="bottom middle"
        )
          | Version de Daemon actuellement installée : {{ daemonVersion?.currentVersion ? ('v' + daemonVersion?.currentVersion) : 'N/A' }}.
          br
          small.text-caption Cliquez pour ouvrir la page de version et consulter les notes de publication.
        small.gt-xs Daemon&nbsp;
        small.text-grey-7(v-text="daemonVersion?.currentVersion ? ('v' + daemonVersion?.currentVersion) : 'N/A'")
      q-separator.q-mx-sm(v-if='orchestratorVersion?.updateAvailable || daemonVersion?.updateAvailable' vertical inset style="width: 2px;")
      q-btn.q-px-xs(
        v-show="orchestratorVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-orchestrator/releases" target="_blank"
      ) Orchestrator
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="orchestratorVersion?.lastVersion")
          | )
      q-btn.q-px-xs(
        v-show="daemonVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-daemon/releases" target="_blank"
      ) Daemon
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="daemonVersion?.lastVersion")
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
