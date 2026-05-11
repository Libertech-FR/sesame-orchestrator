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
              :readonly='pending || requires2fa || retryAfterSecondsLeft > 0'
              autocomplete='username'
              outlined
            )
            q-input.full-width(
              v-model="formData.password"
              label="Mot de passe"
              type="password"
              autocomplete='current-password'
              :readonly='pending || requires2fa || retryAfterSecondsLeft > 0'
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
              :disable='pending || retryAfterSecondsLeft > 0'
              @click.prevent='reset2faFlow'
            ) Retour
            q-space
            q-btn(
              @click.prevent='submit'
              type='submit'
              color='primary'
              size="lg"
              :loading='pending'
              :disable='pending || retryAfterSecondsLeft > 0'
            ) {{ retryAfterSecondsLeft > 0 ? `Réessayez dans ${retryAfterSecondsLeft}s` : (requires2fa ? 'Vérifier' : 'Se connecter') }}
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
        :readonly='pending || retryAfterSecondsLeft > 0'
        outlined
      )
    q-card-actions(align='right')
      q-btn(flat color='primary' :disable='pending || retryAfterSecondsLeft > 0' @click='reset2faFlow') Annuler
      q-btn(
        color='positive'
        icon='mdi-check-circle-outline'
        :loading='pending'
        :disable='pending || retryAfterSecondsLeft > 0'
        @click='submitTotp'
        unelevated
      ) {{ retryAfterSecondsLeft > 0 ? `Réessayez dans ${retryAfterSecondsLeft}s` : 'Vérifier' }}
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
      retryAfterSecondsLeft: ref(0),
      retryAfterTimer: ref<ReturnType<typeof setInterval> | null>(null),
    }
  },
  methods: {
    isRecord(value: unknown): value is Record<string, unknown> {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    },
    getErrorStatus(error: unknown): number | null {
      const anyErr = this.isRecord(error) ? error : {}
      const response = this.isRecord(anyErr.response) ? anyErr.response : {}
      const candidates = [
        anyErr.status,
        anyErr.statusCode,
        response.status,
        response.statusCode,
      ]
      for (const v of candidates) {
        if (typeof v === 'number' && Number.isFinite(v)) return v
      }
      if (typeof response.status === 'string') {
        const n = Number(response.status)
        if (Number.isFinite(n)) return n
      }
      return null
    },
    getRetryAfterSecondsFromError(error: unknown): number | null {
      const anyErr = this.isRecord(error) ? error : {}
      const response = this.isRecord(anyErr.response) ? anyErr.response : {}
      const responseHeaders = this.isRecord(response.headers) ? response.headers : {}
      const headers = this.isRecord(anyErr.headers) ? anyErr.headers : {}
      const payloadCandidates = [
        anyErr.data,
        anyErr._data,
        response.data,
        response._data,
        response,
      ]
      for (const p of payloadCandidates) {
        const v = this.isRecord(p) ? p.retryAfterSeconds : null
        if (typeof v === 'number' && Number.isFinite(v) && v >= 0) return v
        if (typeof v === 'string') {
          const n = Number(v)
          if (Number.isFinite(n) && n >= 0) return n
        }
      }
      const headerCandidates = [
        responseHeaders['retry-after'],
        responseHeaders['Retry-After'],
        headers['retry-after'],
        headers['Retry-After'],
      ]
      for (const h of headerCandidates) {
        if (typeof h === 'string') {
          const n = Number(h)
          if (Number.isFinite(n) && n >= 0) return n
        }
      }
      return null
    },
    clearRetryAfterTimer() {
      if (this.retryAfterTimer) {
        clearInterval(this.retryAfterTimer)
        this.retryAfterTimer = null
      }
    },
    startRetryAfter(seconds: number) {
      const s = Math.max(Math.floor(seconds), 0)
      if (!Number.isFinite(s) || s <= 0) return

      this.clearRetryAfterTimer()
      this.retryAfterSecondsLeft = s
      this.retryAfterTimer = setInterval(() => {
        const next = Math.max(Number(this.retryAfterSecondsLeft || 0) - 1, 0)
        this.retryAfterSecondsLeft = next
        if (next <= 0) this.clearRetryAfterTimer()
      }, 1000)
    },
    notifyTooManyAttempts(error: unknown, context: 'auth' | 'otp') {
      const retryAfterSeconds = this.getRetryAfterSecondsFromError(error)
      if (typeof retryAfterSeconds === 'number' && Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
        this.startRetryAfter(retryAfterSeconds)
      }
      const suffix = typeof retryAfterSeconds === 'number' ? ` Réessayez dans ${retryAfterSeconds}s.` : ' Réessayez plus tard.'
      this.$q.notify({
        type: 'warning',
        message: (context === 'otp' ? 'Trop de tentatives de code 2FA.' : 'Trop de tentatives de connexion.') + suffix,
        position: 'top',
        timeout: 10_000,
      })
    },
    extractPayload(response: unknown): Record<string, unknown> {
      const base = this.isRecord(response) ? response : {}
      const baseData = this.isRecord(base.data) ? base.data : {}
      const base_Data = this.isRecord(base._data) ? base._data : {}
      const candidates: unknown[] = [baseData, base_Data, baseData.data, base_Data.data, base]
      for (const candidate of candidates) {
        if (!candidate || typeof candidate !== 'object') continue
        if ('requires2fa' in candidate || 'challengeToken' in candidate || 'access_token' in candidate || 'uri' in candidate) {
          return candidate as Record<string, unknown>
        }
      }
      return (this.isRecord(base.data) ? base.data : null) || (this.isRecord(base._data) ? base._data : null) || base
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
        const response = await auth.loginWith('local', {
          body: {
            username: this.formData.username,
            password: this.formData.password,
            otpCode: this.formData.otpCode,
            challengeToken: this.challengeToken,
          },
        })
        await auth.fetchUser()
        const authAny = auth as unknown as { user?: { value?: unknown } | unknown }
        const authUser = (this.isRecord(authAny.user) ? authAny.user : null) || (this.isRecord(authAny.user?.value) ? authAny.user.value : null)
        const responsePayload = this.extractPayload(response)
        const uri = this.getPostLoginRedirect((this.isRecord(authUser) ? (authUser.baseURL as string | undefined) : undefined) || (responsePayload.uri as string | undefined))
        this.showTotpDialog = false
        await this.$router.push(uri)
      } catch (error) {
        if (this.getErrorStatus(error) === 429) {
          this.notifyTooManyAttempts(error, 'otp')
          return
        }
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
        let response: unknown = null
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
            this.challengeToken = (preAuthPayload.challengeToken as string | undefined) || ''
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
        const authAny = auth as unknown as { user?: { value?: unknown } | unknown }
        const authUser = (this.isRecord(authAny.user) ? authAny.user : null) || (this.isRecord(authAny.user?.value) ? authAny.user.value : null)
        const responsePayload = this.extractPayload(response)
        const uri = this.getPostLoginRedirect((this.isRecord(authUser) ? (authUser.baseURL as string | undefined) : undefined) || (responsePayload.uri as string | undefined))
        await this.$router.push(uri)
      } catch (error) {
        if (this.getErrorStatus(error) === 429) {
          this.notifyTooManyAttempts(error, 'auth')
          return
        }
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
