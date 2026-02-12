<template lang="pug">
q-layout(view="lHh Lpr fff")
  q-page-container
    q-page.window-height.window-width.row.justify-center.items-center(
      :style-fn="getStyle"
    )
      nuxt-page
      q-fab.absolute(
        style="bottom: 16px; right: 16px;"
        color="primary"
        icon="mdi-help-circle"
        direction='left'
      )
        q-fab-action(
          color="primary"
          icon='mdi-theme-light-dark' @click="toogleDark()"
        )
        q-fab-action(
          color="primary"
          icon='mdi-frequently-asked-questions'
          @click="openLink()"
        )
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'SimpleCenteredLayout',
  setup() {
    const getStyle = () => {
      return {
        backgroundImage: `url('/config/login-background.png'), linear-gradient(#5274C5, #9A4A9F)`,
        backgroundSize: 'cover',
      }
    }

    return { getStyle }
  },
  computed: {
    getQAndALink(): string {
      return (
        'https://github.com/Libertech-FR/sesame-orchestrator/discussions/new?' +
        [
          'category=q-a',
          'title=[QUESTION]%20Votre%20titre%20ici',
          "body=Décrivez%20votre%20question%20ici.%0A%0A---%0A%0A*Merci%20de%20ne%20pas%20oublier%20de%20fournir%20les%20informations%20suivantes%20:%0A%20-%20Version%20de%20l'Orchestrator%20:%20" +
            'N/A' +
            '%0A%20-%20Version%20du%20Daemon%20:%20' +
            'N/A' +
            "%0A%20-%20Système%20d'exploitation%20:%20" +
            (navigator.userAgent || 'N/A'),
        ].join('&')
      )
    },
  },
  methods: {
    openLink() {
      window.open(this.getQAndALink, '_blank')
    },
    toogleDark() {
      this.$q.dark.toggle()
      window.sessionStorage.setItem('darkMode', this.$q.dark.isActive ? 'true' : 'false')
    },
  },
})
</script>
