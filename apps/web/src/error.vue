<template lang="pug">
div(class="q-pa-md flex flex-center full-height" style="background: repeating-linear-gradient(135deg, #7F0000 0 22px, #E53935 22px 44px); height: 100vh;")
  q-card(style="max-width: 400px;")
    q-card-section(class="q-pa-md text-center")
      q-icon(name="mdi-alert-circle" color="negative" size="52px")
      div(class="text-h5 q-my-md") Oups ! Un problème est survenu.
      div(class="text-subtitle1 q-my-md") {{ error.statusCode }} - {{ error.message }}
      div(class="q-my-md") Ne vous inquiétez pas, nous allons vous remettre sur le bon chemin.

    q-card-actions.flex.column.items-center.justify-center(align="around")
      q-btn(flat label="Retour à l'accueil" @click="$router.push('/')")
      q-btn(flat label="Retour a la page précédente" @click="$router.go(-1)")
      q-separator.q-my-md.text-grey-5.full-width
      q-btn(flat label="Essayer à nouveau" @click="reloadPage")

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
import type { NuxtError } from '#app'
import type { PropType } from 'vue'
import { useRouter } from 'vue-router'
import { consola } from 'consola'

export default defineNuxtComponent({
  name: 'ErrorPage',
  props: {
    error: {
      type: Object as PropType<NuxtError>,
      default: null,
    },
  },
  setup(props) {
    const router = useRouter();

    function reloadPage() {
      location.reload();
    }

    consola.error(props.error)

    return {
      router,
      reloadPage,
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

<style lang="sass">
html,
body,
#__nuxt
  height: 100%
</style>
