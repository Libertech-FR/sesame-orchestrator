<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md
    .row.justify-center
      .col-12.col-md-9.col-lg-7
        q-card(flat bordered)
          q-toolbar
            q-toolbar-title Mon profil
            q-space
            q-btn(
              flat
              icon='mdi-key-variant'
              color='primary'
              @click='showPasswordDialog = true'
            ) Changer le mot de passe
            q-btn.q-ml-sm(
              color='positive'
              icon='mdi-content-save'
              :loading='pendingSave'
              @click='save'
              unelevated
            ) Enregistrer
          q-separator
          q-card-section.q-pa-lg
            .text-subtitle1.text-weight-medium Informations générales
            .row.q-col-gutter-md.q-mt-sm
              .col-12.col-md-6
                q-input(
                  v-model='form.displayName'
                  label='Nom affiché'
                  outlined
                )
              .col-12.col-md-6
                q-input(
                  v-model='form.email'
                  label='Email'
                  type='email'
                  outlined
                )
              .col-12
                q-input(
                  v-model='form.baseURL'
                  label='URL de base'
                  outlined
                )
          q-separator
          q-card-section.q-pa-lg
            .text-subtitle1.text-weight-medium Sécurité
            .row.items-center.q-col-gutter-sm.q-mt-sm
              .col-auto
                q-badge(
                  :color='isTotpEnabled ? "positive" : "grey-7"'
                  text-color='white'
                ) {{ isTotpEnabled ? 'MFA TOTP activé' : 'MFA TOTP désactivé' }}
              .col-auto
                q-btn(
                  v-if='!isTotpEnabled'
                  color='primary'
                  icon='mdi-qrcode'
                  :loading='pendingTotpSetup'
                  @click='startTotpSetup'
                  unelevated
                ) Configurer avec QR code
              .col-auto
                q-btn(
                  v-if='isTotpEnabled'
                  flat
                  color='warning'
                  icon='mdi-shield-off-outline'
                  :loading='pendingTotpDisable'
                  @click='disableTotp'
                ) &nbsp;&nbsp;Désactiver

            q-card.q-mt-md(v-if='totpSetup.otpauthUrl' flat bordered)
              q-card-section
                .text-subtitle2 Scanner le QR code
                .text-caption.text-grey-7 Ensuite saisissez le code à 6 chiffres pour confirmer.
              q-separator
              q-card-section
                .row.q-col-gutter-lg.items-start
                  .col-12.col-sm-auto
                    q-img(
                      :src='totpQrCodeUrl'
                      fit='contain'
                      style='width: 220px; height: 220px'
                    )
                  .col
                    q-input(
                      :model-value='totpSetup.secret'
                      label='Clé secrète (manuel)'
                      readonly
                      outlined
                    )
                    q-input.q-mt-sm(
                      v-model='totpSetup.otpCode'
                      label='Code OTP (6 chiffres)'
                      maxlength='6'
                      outlined
                    )
                    .row.q-gutter-sm.q-mt-md
                      q-btn(
                        flat
                        color='primary'
                        @click='cancelTotpSetup'
                      ) Annuler
                      q-btn(
                        color='positive'
                        icon='mdi-check-circle-outline'
                        :loading='pendingTotpConfirm'
                        @click='confirmTotpSetup'
                        unelevated
                      ) Activer MFA
            q-banner.q-mt-md(
              v-else-if='totpSetup.secret'
              dense
              rounded
              inline-actions
            )
              | La configuration MFA est reçue mais l'URL du QR code est absente.
              template(#action)
                q-btn(flat color='primary' @click='cancelTotpSetup') Réinitialiser

    q-dialog(v-model='showPasswordDialog')
      q-card(style='min-width: 420px; max-width: 95vw')
        q-card-section
          .text-h6 Changer le mot de passe
        q-card-section.q-pt-none.q-gutter-md
          q-input(
            v-model='passwordForm.currentPassword'
            label='Mot de passe actuel'
            :type='showCurrentPassword ? "text" : "password"'
            outlined
          )
            template(#append)
              q-icon.cursor-pointer(
                :name='showCurrentPassword ? "mdi-eye-off" : "mdi-eye"'
                @click='showCurrentPassword = !showCurrentPassword'
              )
          q-input(
            v-model='passwordForm.password'
            label='Nouveau mot de passe'
            :type='showNewPassword ? "text" : "password"'
            outlined
          )
            template(#append)
              q-icon.cursor-pointer(
                :name='showNewPassword ? "mdi-eye-off" : "mdi-eye"'
                @click='showNewPassword = !showNewPassword'
              )
          q-input(
            v-model='passwordForm.confirmPassword'
            label='Confirmer le mot de passe'
            :type='showConfirmPassword ? "text" : "password"'
            outlined
          )
            template(#append)
              q-icon.cursor-pointer(
                :name='showConfirmPassword ? "mdi-eye-off" : "mdi-eye"'
                @click='showConfirmPassword = !showConfirmPassword'
              )
        q-card-actions(align='right')
          q-btn(flat color='primary' v-close-popup) Annuler
          q-btn(
            color='positive'
            icon='mdi-content-save'
            :loading='pendingPasswordSave'
            @click='savePassword'
            unelevated
          ) Mettre à jour
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'

type Agent = components['schemas']['AgentsDto']

type TotpSetupPayload = { secret: string; otpauthUrl: string }

export default defineNuxtComponent({
  name: 'ProfilePage',
  async setup() {
    const { handleErrorReq } = useErrorHandling()
    const pendingSave = ref(false)
    const pendingPasswordSave = ref(false)
    const pendingTotpSetup = ref(false)
    const pendingTotpConfirm = ref(false)
    const pendingTotpDisable = ref(false)
    const showPasswordDialog = ref(false)

    const { data, error, refresh } = await useHttp<Agent>('/core/agents/me', {
      method: 'get',
      transform: (result: unknown) => {
        const res = result as { data?: Agent } | undefined
        if (!res || res.data == null) throw new Error('Invalid API response')
        const agent = res.data as Agent & { security?: { allowedNetworks?: string[]; otpKey?: string }; allowedNetworks?: string[]; otpKey?: string }
        return {
          ...agent,
          allowedNetworks: Array.isArray(agent?.security?.allowedNetworks) ? [...agent.security.allowedNetworks] : [],
          otpKey: agent?.security?.otpKey || '',
        } as Agent
      },
    })

    if (error.value) {
      throw handleErrorReq({
        error: error.value,
        message: 'Impossible de charger votre profil',
      })
    }

    const form = ref({
      displayName: data.value?.displayName || '',
      email: data.value?.email || '',
      baseURL: data.value?.baseURL || '/',
    })
    const isTotpEnabled = ref(`${(data.value as unknown as { otpKey?: string } | undefined)?.otpKey || ''}`.trim().length > 0)
    const totpSetup = ref({
      secret: '',
      otpauthUrl: '',
      otpCode: '',
    })
    const passwordForm = ref({
      currentPassword: '',
      password: '',
      confirmPassword: '',
    })
    const showCurrentPassword = ref(false)
    const showNewPassword = ref(false)
    const showConfirmPassword = ref(false)

    return {
      pendingSave,
      pendingPasswordSave,
      pendingTotpSetup,
      pendingTotpConfirm,
      pendingTotpDisable,
      showPasswordDialog,
      form,
      isTotpEnabled,
      totpSetup,
      passwordForm,
      showCurrentPassword,
      showNewPassword,
      showConfirmPassword,
      refresh,
      handleErrorReq,
    }
  },
  methods: {
    extractTotpSetupPayload(response: unknown): TotpSetupPayload {
      const r = response as Record<string, unknown> | undefined
      const candidates: unknown[] = [r, (r as any)?.data, (r as any)?._data, (r as any)?.data?.data, (r as any)?._data?.data]

      for (const candidate of candidates) {
        const c = candidate as Record<string, unknown> | undefined
        const secret = `${c?.secret || ''}`.trim()
        const otpauthUrl = `${c?.otpauthUrl || c?.otpauth_url || ''}`.trim()
        if (secret || otpauthUrl) {
          return { secret, otpauthUrl }
        }
      }

      return { secret: '', otpauthUrl: '' }
    },
    async save() {
      this.pendingSave = true
      try {
        const body: Record<string, unknown> = {
          displayName: this.form.displayName,
          email: this.form.email,
          baseURL: this.form.baseURL || '/',
        }

        await this.$http.patch('/core/agents/me', { body })
        await this.refresh()
        this.$q.notify({
          type: 'positive',
          message: 'Profil mis à jour',
          position: 'top-right',
        })
        this.$router.go(0)
      } catch (error) {
        this.handleErrorReq({
          error,
          message: 'Impossible de sauvegarder le profil',
        })
      } finally {
        this.pendingSave = false
      }
    },
    async startTotpSetup() {
      this.pendingTotpSetup = true
      try {
        const response = await this.$http.post('/core/agents/me/mfa/totp/setup')
        const payload = this.extractTotpSetupPayload(response)
        this.totpSetup.secret = payload.secret
        this.totpSetup.otpauthUrl = payload.otpauthUrl
        this.totpSetup.otpCode = ''
        if (!this.totpSetup.otpauthUrl) {
          this.$q.notify({
            type: 'warning',
            message: 'Configuration MFA reçue sans URL QR. Utilisez la clé secrète manuelle.',
            position: 'top-right',
          })
        }
      } catch (error) {
        this.handleErrorReq({
          error,
          message: 'Impossible de générer la configuration MFA',
        })
      } finally {
        this.pendingTotpSetup = false
      }
    },
    cancelTotpSetup() {
      this.totpSetup.secret = ''
      this.totpSetup.otpauthUrl = ''
      this.totpSetup.otpCode = ''
    },
    async confirmTotpSetup() {
      const otpCode = `${this.totpSetup.otpCode || ''}`.trim()
      if (!this.totpSetup.secret || !otpCode) {
        this.$q.notify({
          type: 'negative',
          message: 'Veuillez saisir le code OTP pour confirmer',
          position: 'top-right',
        })
        return
      }
      this.pendingTotpConfirm = true
      try {
        await this.$http.post('/core/agents/me/mfa/totp/confirm', {
          body: {
            secret: this.totpSetup.secret,
            otpCode,
          },
        })
        this.isTotpEnabled = true
        this.cancelTotpSetup()
        this.$q.notify({
          type: 'positive',
          message: 'MFA TOTP activé',
          position: 'top-right',
        })
      } catch (error) {
        this.handleErrorReq({
          error,
          message: "Impossible d'activer le MFA",
        })
      } finally {
        this.pendingTotpConfirm = false
      }
    },
    async disableTotp() {
      this.pendingTotpDisable = true
      try {
        await this.$http.post('/core/agents/me/mfa/totp/disable')
        this.isTotpEnabled = false
        this.cancelTotpSetup()
        this.$q.notify({
          type: 'positive',
          message: 'MFA TOTP désactivé',
          position: 'top-right',
        })
      } catch (error) {
        this.handleErrorReq({
          error,
          message: 'Impossible de désactiver le MFA',
        })
      } finally {
        this.pendingTotpDisable = false
      }
    },
    async savePassword() {
      const currentPassword = `${this.passwordForm.currentPassword || ''}`.trim()
      const password = `${this.passwordForm.password || ''}`.trim()
      const confirmPassword = `${this.passwordForm.confirmPassword || ''}`.trim()

      if (!currentPassword) {
        this.$q.notify({
          type: 'negative',
          message: 'Veuillez saisir votre mot de passe actuel',
          position: 'top-right',
        })
        return
      }

      if (!password) {
        this.$q.notify({
          type: 'negative',
          message: 'Veuillez saisir un mot de passe',
          position: 'top-right',
        })
        return
      }

      if (password !== confirmPassword) {
        this.$q.notify({
          type: 'negative',
          message: 'La confirmation du mot de passe ne correspond pas',
          position: 'top-right',
        })
        return
      }

      this.pendingPasswordSave = true
      try {
        await this.$http.patch('/core/agents/me', {
          body: {
            currentPassword,
            password,
          },
        })
        this.passwordForm.currentPassword = ''
        this.passwordForm.password = ''
        this.passwordForm.confirmPassword = ''
        this.showPasswordDialog = false
        this.$q.notify({
          type: 'positive',
          message: 'Mot de passe mis à jour. Reconnexion nécessaire.',
          position: 'top-right',
        })
        await useAuth().logout()
        this.$router.go(0)
      } catch (error) {
        this.handleErrorReq({
          error,
          message: 'Impossible de mettre à jour le mot de passe',
        })
      } finally {
        this.pendingPasswordSave = false
      }
    },
  },
  computed: {
    totpQrCodeUrl(): string {
      if (!this.totpSetup?.otpauthUrl) return ''
      return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(this.totpSetup.otpauthUrl)}`
    },
  },
})
</script>
