<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md.flex
    div.fit
      .row.q-gutter-lg
        h5.q-ma-lg
          span Serveur SMTP&nbsp;
          small (envoi des courriels)
      .row.q-col-gutter-md
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.host"
          label="Serveur SMTP (URL smtp://...)"
          hint="Exemple : smtp://smtp.server.com:port"
          :error="!!validations['host']"
          :error-message='validations["host"]'
          dense
        )
        .offset-md-1
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.emetteur"
          label="Adresse émetteur"
          hint="Adresse émetteur de connexion au serveur SMTP"
          :error="!!validations['emetteur']"
          :error-message='validations["emetteur"]'
          dense
        )
        .offset-md-1
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.username"
          label="Nom d'utilisateur"
          hint="Nom d'utilisateur de connexion au serveur SMTP"
          :error="!!validations['username']"
          :error-message='validations["username"]'
          dense
        )
        .offset-md-1
        q-input.col-12.col-md-6(
          :type="typePasswordProp"
          outlined
          v-model="payload.password"
          label="Mot de passe"
          hint="Mot de passe de connexion au serveur SMTP"
          :error="!!validations['password']"
          :error-message='validations["password"]'
          dense
        )
          template(v-slot:append)
            q-icon.cursor-pointer(name="mdi-eye" @click="togglePassword")
        .offset-md-1
  q-card-actions.sticky-footer.border-top.full-width
    q-space
    q-btn.text-positive(
      flat
      label="Sauvegarder les paramètres"
      icon-right="mdi-content-save"
      @click="saveParams"
    )
</template>

<script lang="ts">
import { ref } from 'vue'

type SmtpSettings = {
  host: string
  emetteur: string
  username: string
  password: string
}

export default defineComponent({
  name: 'SettingsSmtpPage',
  data() {
    return {
      typePasswordProp: 'password',
    }
  },
  async setup() {
    const { handleError } = useErrorHandling()

    const payload = ref({
      host: '',
      emetteur: '',
      username: '',
      password: '',
    } as SmtpSettings)
    const validations = ref({} as Record<string, any>)

    const {
      data: result,
      pending,
      error,
      refresh,
    } = await useHttp<{ data: SmtpSettings }>(`/settings/mail/get`, {
      method: 'GET',
    })
    if (error.value) {
      handleError({
        error: error.value,
        message: 'Erreur lors de de la lecture des paramètres',
      })
    } else {
      payload.value = result.value?.data || payload.value
      validations.value = {}
    }

    return {
      payload,
      handleError,
      pending,
      refresh,
      validations,
    }
  },
  methods: {
    async saveParams() {
      try {
        await this.$http.post(`/settings/mail/set`, {
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
    togglePassword() {
      this.typePasswordProp = this.typePasswordProp === 'password' ? 'text' : 'password'
    },
  },
})
</script>
