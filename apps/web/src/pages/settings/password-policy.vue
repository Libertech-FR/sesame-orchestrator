<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md.flex
    div(style='min-height: 100%; min-width: 100%;')
      .row.q-gutter-lg
        h5.q-ma-lg
          span Politique des mots de passe&nbsp;
      .row.q-col-gutter-md
        q-input.col-12.col-sm-4.col-md-3.col-lg-3(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.len"
          input-class="text-right"
          label="Longueur minimale"
          hint="Longueur minimale du mot de passe"
          dense
        )
        q-input.col-12.col-sm-4.col-md-3.col-lg-3(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.minComplexity"
          input-class="text-right"
          label="Entropie minimale"
          hint="Entropie à atteindre pour que le mot de passe soit considéré comme acceptable"
          dense
        )
        q-input.col-12.col-sm-4.col-md-3.col-lg-3(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.goodComplexity"
          input-class="text-right"
          label="Complexité souhaitée"
          hint="Entropie à atteindre pour que le mot de passe soit considéré comme bon"
          dense
        )
      q-separator.q-mt-xl
      .row.q-col-gutter-md.q-mt-md
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.hasUpperCase"
          color="green"
          label="Doit contenir au moins une Majuscule"
          :true-value="1"
          :false-value="0"
        )
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.hasLowerCase"
          color="purple"
          label="Doit contenir au moins une Minuscule"
          :true-value="1"
          :false-value="0"
        )
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.hasNumbers"
          color="orange"
          label="Doit contenir au moins un chiffre"
          :true-value="1"
          :false-value="0"
        )
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.hasSpecialChars"
          color="blue"
          label="Doit contenir au moins un caractère spécial"
          :true-value="1"
          :false-value="0"
        )
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.checkPwned"
          color="black"
          label="Vérifier les mots de passe compromis"
        )
          q-tooltip.text-body2(anchor="center right" self="center left" :offset="[12, 0]")
            | Utilise l'API HIBP (Pwned Passwords) pour vérifier si le mot de passe a été compromis dans une fuite de données.
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update") || !payload.checkPwned || !hibpKeyStatus.valid'
          dense
          v-model="payload.pwnedRecheckEnabled"
          color="teal"
          label="Stockage des empreintes HIBP (Pwned Passwords)"
        )
          q-tooltip.text-body2(anchor="center right" self="center left" :offset="[12, 0]" v-if="!payload.checkPwned")
            | Activer d’abord « Vérifier les mots de passe compromis ».
          q-tooltip.text-body2(anchor="center right" self="center left" :offset="[12, 0]" v-else-if="!hibpKeyStatus.valid")
            span(v-text="hibpKeyStatus.reason || 'Clé SESAME_PASSWORD_HISTORY_HIBP_KEY invalide'")
          q-tooltip.text-body2(anchor="center right" self="center left" :offset="[12, 0]" v-else)
            | Active le stockage des empreintes SHA-1 chiffrées (non réversibles) dans l'historique des mots de passe pour permettre le re-check planifié.
        q-toggle.col-12.col-sm-6.col-md-4.col-lg-3(
          :disable='!hasPermission("/settings/passwdadm", "update")'
          dense
          v-model="payload.resetBySms"
          color="red"
          label="Réinitialisation par SMS active"
        )
      q-separator.q-mt-lg
      .row.q-col-gutter-md.q-mt-md
        q-input.col-12.col-sm-6.col-md-5.col-lg-4(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="text"
          outlined
          v-model="payload.emailAttribute"
          label="Attribut de l'identité contenant le mail alternatif"
          hint="Attribut de l'identité contenant le mail alternatif utilisé pour la réinitialisation du mot de passe"
          dense
        )
        q-input.col-12.col-sm-6.col-md-5.col-lg-4(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="text"
          outlined
          v-model="payload.mobileAttribute"
          label="Attribut de l'identité contenant le numéro de mobile"
          hint="Attribut de l'identité contenant le numéro de mobile utilisé pour la réinitialisation du mot de passe"
          dense
        )
        q-input.col-12.col-md-10.col-lg-8(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="url"
          outlined
          v-model="payload.redirectUrl"
          label="URL de redirection après changement de mot de passe"
          hint="URL de redirection après un changement de mot de passe réussi"
          dense
        )
      .row.q-col-gutter-md.q-mt-md
        q-input.col-12.col-sm-6.col-md-5.col-lg-4(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.pwnedRecheckMaxAgeSeconds"
          input-class="text-right"
          label="Âge max avant re-check HIBP (secondes)"
          hint="Re-check uniquement si la dernière vérification est plus ancienne que ce délai"
          dense
        )
        q-select.col-12.col-sm-6.col-md-5.col-lg-4(
          :disable='!hasPermission("/settings/passwdadm", "update") || !payload.pwnedRecheckEnabled || !hibpKeyStatus.valid'
          outlined
          dense
          emit-value
          map-options
          v-model="payload.pwnedRecheckAction"
          :options="pwnedActions"
          label="Action si mot de passe compromis lors du re-check HIBP"
          hint="« Notifier » avertit l'utilisateur sans le bloquer. « Expirer » force un changement au prochain usage."
        )
      q-separator.q-my-lg
      .row.q-col-gutter-md
        q-input.col-12.col-md-6(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.resetCodeTTL"
          label="Temps de vie du code de réinitialisation (en secondes)"
          hint="Durée pendant laquelle le code de réinitialisation est valide"
          dense
        )
        q-input.col-12.col-md-6(
          :readonly='!hasPermission("/settings/passwdadm", "update")'
          type="number"
          outlined
          v-model="payload.initTokenTTL"
          label="Temps de vie du token d'initialisation (en secondes)"
          hint="Durée pendant laquelle le token d'initialisation envoyé par mail est valide"
          dense
        )
  q-card-actions.sticky-footer.border-top.full-width
    q-space
    q-btn.text-positive(
      :disable='!hasPermission("/settings/passwdadm", "update")'
      flat
      label="Sauvegarder les paramètres"
      icon-right="mdi-content-save"
      @click="saveParams"
    )
      q-tooltip.text-body2.bg-negative.text-white(
        v-if="!hasPermission('/settings/passwdadm', 'update')"
        anchor="top middle"
        self="center middle"
      ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
</template>

<script lang="ts">
import { ref, watch } from 'vue'

type PasswordPolicySettings = {
  len: number
  hasUpperCase: 0 | 1
  hasLowerCase: 0 | 1
  hasNumbers: 0 | 1
  hasSpecialChars: 0 | 1
  checkPwned: boolean
  pwnedRecheckEnabled: boolean
  pwnedRecheckMaxAgeSeconds: number
  pwnedRecheckAction: 'none' | 'notify' | 'expire'
  resetBySms: boolean
  emailAttribute: string
  mobileAttribute: string
  redirectUrl: string
  goodComplexity: number
  minComplexity: number
  resetCodeTTL: number
  initTokenTTL: number
}

export default defineComponent({
  name: 'SettingsPasswordPolicyPage',
  data() {
    return {}
  },
  async setup() {
    const { handleError } = useErrorHandling()
    const { hasPermission } = useAccessControl()

    const pwnedActions = [
      { label: 'Ne rien faire', value: 'none' },
      { label: "Notifier l'utilisateur", value: 'notify' },
      { label: 'Expirer le mot de passe', value: 'expire' },
    ] as const

    const payload = ref({
      len: 8,
      hasUpperCase: 0,
      hasLowerCase: 0,
      hasNumbers: 0,
      hasSpecialChars: 0,
      checkPwned: false,
      pwnedRecheckEnabled: false,
      pwnedRecheckMaxAgeSeconds: 60 * 60 * 24 * 7,
      pwnedRecheckAction: 'none',
      resetBySms: false,
      emailAttribute: '',
      mobileAttribute: '',
      redirectUrl: '',
      goodComplexity: 0,
      minComplexity: 0,
      resetCodeTTL: 0,
      initTokenTTL: 0,
    })
    const validations = ref({} as Record<string, any>)
    const hibpKeyStatus = ref<{ valid: boolean; reason: string | null }>({ valid: true, reason: null })

    const {
      data: result,
      pending,
      error,
      refresh,
    } = await useHttp<{ data: PasswordPolicySettings }>(`/settings/passwdadm/getpolicies`, {
      method: 'GET',
    })

    const { data: keyStatusResult } = await useHttp<{ data: { valid: boolean; reason: string | null } }>(`/settings/passwdadm/hibp-keystatus`, {
      method: 'GET',
    })
    if (keyStatusResult.value?.data) {
      hibpKeyStatus.value = keyStatusResult.value.data
    }
    if (error.value) {
      handleError({
        error: error.value,
        message: 'Erreur lors de de la lecture des paramètres',
      })
    } else {
      payload.value = result.value?.data || payload.value
      validations.value = {}
    }

    if (!hibpKeyStatus.value.valid) {
      payload.value.pwnedRecheckEnabled = false
    }

    watch(
      () => payload.value.checkPwned,
      (enabled) => {
        if (!enabled) {
          payload.value.pwnedRecheckEnabled = false
          payload.value.pwnedRecheckAction = 'none'
        }
      },
    )

    return {
      payload,
      pwnedActions,
      hibpKeyStatus,
      handleError,
      pending,
      refresh,
      validations,
      hasPermission,
    }
  },
  methods: {
    async saveParams() {
      try {
        await this.$http.post(`/settings/passwdadm/setpolicies`, {
          body: this.payload,
        })

        this.$q.notify({
          message: 'Les paramètres ont été sauvegardés',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        this.validations = {}
      } catch (error: any) {
        this.handleError({
          error,
          message: error?.response?._data?.message || 'Erreur lors de la sauvegarde des paramètres',
          notify: true,
        })
        this.validations = error?.response?._data?.validations || {}
      }
    },
  },
})
</script>
