<template lang="pug">
.fullscreen.flex.flex-center
  .absolute-full.bg-black(style="opacity: .45;")
  q-card.relative(flat bordered style="min-width: 380px; max-width: 95vw;")
    q-card-section
      .row.items-center.q-gutter-sm
        q-icon(name="mdi-shield-alert-outline" color="warning" size="md")
        .text-h6 Session MFA requise
      .text-caption.text-grey-7.q-mt-xs
        | Cette action nécessite une session MFA. Reconnectez-vous puis validez votre code 2FA pour continuer.
    q-separator
    q-card-actions(align="right")
      q-btn(flat color="grey-7" @click="goBack") Annuler
      q-btn(color="warning" icon="mdi-login" unelevated @click="goLogin") Se reconnecter
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'MfaRequiredPage',
  setup() {
    definePageMeta({
      layout: 'simple-centered',
      auth: {
        unauthenticatedOnly: true,
        navigateAuthenticatedTo: '/',
      },
    })

    const route = useRoute()
    const router = useRouter()

    const redirect = computed(() => {
      const q = route.query.redirect
      if (typeof q !== 'string') return '/'
      const value = q.trim()
      if (!value) return '/'
      if (!value.startsWith('/')) return '/'
      return value
    })

    const goLogin = () => router.push({ path: '/login', query: { redirect: redirect.value } })
    const goBack = () => router.push(redirect.value)

    return { goLogin, goBack }
  },
})
</script>

<style scoped lang="sass">
.fullscreen
  position: fixed
  inset: 0
  z-index: 2000
</style>

