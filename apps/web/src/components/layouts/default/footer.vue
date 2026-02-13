<template lang="pug">
  q-footer(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" bordered)
    q-bar(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-black'")
      span
        small.gt-xs Orchestrator&nbsp;
        small(v-text="'v' + (orchestratorVersion?.currentVersion || '0.0.0')")
      small.bold &nbsp;/&nbsp;
      span
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
      q-btn.q-px-sm(@click="toogleDark" flat stretch icon="mdi-theme-light-dark")
      q-btn.q-px-sm(flat stretch icon="mdi-frequently-asked-questions" :href="getQAndALink" target="_blank")
        q-tooltip.text-body2 Poser&nbsp;une&nbsp;question&nbsp;ou&nbsp;signaler&nbsp;un&nbsp;problème
      q-btn.q-px-sm(flat stretch icon="mdi-help" href="https://libertech-fr.github.io/sesame-doc/" target="_blank")
        q-tooltip.text-body2 Aide&nbsp;et&nbsp;Documentation
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'LayoutsDefaultFooterComponent',
  setup() {
    return {
      orchestratorVersion: {},
      daemonVersion: {},
    }
  },
  computed: {
    getQAndALink(): string {
      return (
        'https://github.com/Libertech-FR/sesame-orchestrator/discussions/new?' +
        [
          'category=q-a',
          'title=[QUESTION]%20Votre%20titre%20ici',
          "body=Décrivez%20votre%20question%20ici.%0A%0A---%0A%0A*Merci%20de%20ne%20pas%20oublier%20de%20fournir%20les%20informations%20suivantes%20:%0A%20-%20Version%20de%20l'Orchestrator%20:%20" +
            (this.orchestratorVersion?.currentVersion || 'N/A') +
            '%0A%20-%20Version%20du%20Daemon%20:%20' +
            (this.daemonVersion?.currentVersion || 'N/A') +
            "%0A%20-%20Système%20d'exploitation%20:%20" +
            (navigator.userAgent || 'N/A'),
        ].join('&')
      )
    },
  },
  methods: {
    toogleDark() {
      this.$q.dark.toggle()
      window.sessionStorage.setItem('darkMode', this.$q.dark.isActive ? 'true' : 'false')
    },
  },
})
</script>
