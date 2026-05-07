<template lang="pug">
q-card.col.q-ma-xl(flat bordered style="min-width: 300px; max-width: 600px;")
  q-toolbar.bg-primary.text-white
    q-toolbar-title Authentification
  div(:class='[$q.screen.gt.xs ? "row" : "column"]')
    q-card-section.col-5(v-if='$q.screen.gt.xs')
      q-img.full-height(
        src="/config/login-side.png"
        error-src="/default.png"
        alt="Sesame logo"
        fit="cover"
      )
    q-separator.q-mx-md.q-my-md(v-if='$q.screen.gt.xs' vertical)
    q-card.col(flat)
      form.login.fit(@submit.prevent='submit')
        q-card-section.column.full-height
          .col.column.items-center.justify-center.q-gutter-md.q-pl-md
            q-input.full-width(
              v-model="formData.username"
              label="Nom d'utilisateur"
              type="text"
              :readonly='pending || requires2fa'
              autocomplete='username'
              outlined
            )
            q-input.full-width(
              v-model="formData.password"
              label="Mot de passe"
              type="password"
              autocomplete='current-password'
              :readonly='pending || requires2fa'
              outlined
            )
            q-input.full-width(
              v-if='requires2fa'
              model-value='Code 2FA requis'
              label='Code 2FA'
              readonly
              outlined
            )
          q-card-actions.q-mt-md(
            stzyle='position: sticky; bottom: 0; right: 0; left: 0;'
          )
            q-btn(
              v-if='requires2fa'
              flat
              :disable='pending'
              @click.prevent='reset2faFlow'
            ) Retour
            q-space
            q-btn(
              @click.prevent='submit'
              type='submit'
              color='primary'
              size="lg"
              :loading='pending'
            ) {{ requires2fa ? 'Vérifier' : 'Se connecter' }}
            q-space

q-dialog(v-model='showTotpDialog' persistent)
  q-card(style='min-width: 380px; max-width: 95vw')
    q-card-section
      .text-h6 Vérification 2FA
      .text-caption.text-grey-7 Entrez le code TOTP à 6 chiffres de votre application.
    q-card-section.q-pt-none
      q-input(
        v-model='formData.otpCode'
        label='Code 2FA (6 chiffres)'
        maxlength='6'
        autocomplete='one-time-code'
        :readonly='pending'
        outlined
      )
    q-card-actions(align='right')
      q-btn(flat color='primary' :disable='pending' @click='reset2faFlow') Annuler
      q-btn(
        color='positive'
        icon='mdi-check-circle-outline'
        :loading='pending'
        @click='submitTotp'
        unelevated
      ) Vérifier
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'LoginPage',
  setup() {
    definePageMeta({
      layout: 'simple-centered',
      auth: {
        unauthenticatedOnly: true,
        navigateAuthenticatedTo: '/',
      },
    })

    return {
      pending: ref(false),
      formData: ref({
        username: '',
        password: '',
        otpCode: '',
      }),
      requires2fa: ref(false),
      challengeToken: ref(''),
      showTotpDialog: ref(false),
    }
  },
  methods: {
    extractPayload(response: any): Record<string, any> {
      const candidates = [response?.data, response?._data, response?.data?.data, response?._data?.data, response]
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue
        if ('requires2fa' in candidate || 'challengeToken' in candidate || 'access_token' in candidate || 'uri' in candidate) {
          return candidate
        }
      }
      return response?.data || response?._data || response || {}
    },
    normalizeRedirectUri(uri?: string): string {
      const fallback = '/'
      if (typeof uri !== 'string') return fallback
      const value = uri.trim()
      if (!value) return fallback
      if (!value.startsWith('/')) return `/${value}`
      return value
    },
    getPostLoginRedirect(responseOrBaseUrl?: string): string {
      const q = (this.$route?.query as Record<string, unknown> | undefined)?.redirect
      if (typeof q === 'string') {
        const value = q.trim()
        if (value.startsWith('/')) return this.normalizeRedirectUri(value)
      }
      return this.normalizeRedirectUri(responseOrBaseUrl)
    },
    reset2faFlow() {
      this.requires2fa = false
      this.challengeToken = ''
      this.formData.otpCode = ''
      this.showTotpDialog = false
    },
    async submitTotp() {
      this.pending = true
      try {
        const auth = useAuth()
        const response: any = await auth.loginWith('local', {
          body: {
            username: this.formData.username,
            password: this.formData.password,
            otpCode: this.formData.otpCode,
            challengeToken: this.challengeToken,
          },
        })
        await auth.fetchUser()
        const authUser = (auth as any)?.user?.value || (auth as any)?.user
        const uri = this.getPostLoginRedirect(authUser?.baseURL || response?.data?.uri)
        this.showTotpDialog = false
        await this.$router.push(uri)
      } catch (error) {
        this.$q.notify({
          type: 'negative',
          message: 'Code 2FA invalide ou expiré',
          position: 'top',
          timeout: 7000,
        })
      } finally {
        this.pending = false
      }
    },
    async submit() {
      this.pending = true
      try {
        const auth = useAuth()
        let response: any = null
        if (!this.requires2fa) {
          const preAuthResponse = await this.$http.post('/core/auth/local', {
            body: {
              username: this.formData.username,
              password: this.formData.password,
            },
          })
          const preAuthPayload = this.extractPayload(preAuthResponse)
          if (preAuthPayload?.requires2fa) {
            this.requires2fa = true
            this.challengeToken = preAuthPayload.challengeToken || ''
            this.showTotpDialog = true
            this.$q.notify({
              type: 'info',
              message: 'Entrez votre code 2FA pour finaliser la connexion.',
              position: 'top',
              timeout: 4000,
            })
            return
          }
          response = await auth.loginWith('local', {
            body: {
              username: this.formData.username,
              password: this.formData.password,
            },
          })
        } else {
          this.showTotpDialog = true
          return
        }
        await auth.fetchUser()
        const authUser = (auth as any)?.user?.value || (auth as any)?.user
        const uri = this.getPostLoginRedirect(authUser?.baseURL || response?.data?.uri)
        await this.$router.push(uri)
      } catch (error) {
        this.$q.notify({
          type: 'negative',
          message: 'Erreur de connexion: ' + (error instanceof Error ? error.message : 'Unknown error'),
          position: 'top',
          timeout: 10_000,
        })
      } finally {
        this.pending = false
      }
    },
  },
})
</script>

<style lang="sass">
body.body--dark form.login input:-webkit-autofill
  -webkit-box-shadow: 0 0 0px 1000px var(--q-dark) inset !important
  -webkit-text-fill-color: #fff !important
  caret-color: #fff !important
</style>
