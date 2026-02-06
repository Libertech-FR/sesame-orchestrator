<template lang="pug">
q-page.flex.flex-center
  .align-center.column.full-height
    .text-body1.text-center Page d'identité déplacée
    .text-body2.text-center Ajoutez <code>/table</code> dans l'URL pour accéder à la table des identités.
    a(:href="newPath")
      pre {{ newPath }}
    small.text-center Redirection automatique dans {{ countdown }} secondes...
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesIndexPage',
  data() {
    return {
      countdown: 10,
    }
  },
  computed: {
    newPath() {
      const oldPath = this.$route.fullPath
      return oldPath.replace('/identities', '/identities/table')
    },
  },
  mounted() {
    const interval = setInterval(() => {
      this.countdown -= 1
      if (this.countdown <= 0) {
        clearInterval(interval)
        this.$router.replace(this.newPath)
      }
    }, 1_000)
  },
})
</script>
