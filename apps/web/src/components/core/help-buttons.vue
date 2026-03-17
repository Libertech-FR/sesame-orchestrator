<template lang="pug">

  q-btn.q-px-sm(@click="toogleDark" flat stretch icon="mdi-theme-light-dark" :size="size")
    q-tooltip.text-body2(anchor="top middle" self="bottom middle") Mode sombre/clair
  q-btn.q-px-sm(flat stretch icon="mdi-frequently-asked-questions" :href="getQAndALink" target="_blank" :size="size")
    q-tooltip.text-body2 Poser&nbsp;une&nbsp;question&nbsp;ou&nbsp;signaler&nbsp;un&nbsp;problème
  q-btn.q-px-sm(flat stretch icon="mdi-help" href="https://libertech-fr.github.io/sesame-doc/" target="_blank" :size="size")
    q-tooltip.text-body2 Aide&nbsp;et&nbsp;Documentation
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'HelpButtonsComponent',
  props: {
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'sm',
    },
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
  setup() {
    const orchestratorVersion = inject<{
      currentVersion?: string
      lastVersion?: string
      updateAvailable?: boolean
    }>('orchestratorVersion', {})
    const daemonVersion = inject<{
      currentVersion?: string
      lastVersion?: string
      updateAvailable?: boolean
    }>('daemonVersion', {})

    return {
      orchestratorVersion,
      daemonVersion,
    }
  },
  methods: {
    toogleDark() {
      this.$q.dark.toggle()
      window.sessionStorage.setItem('darkMode', this.$q.dark.isActive ? 'true' : 'false')
    },
  },
})
</script>
