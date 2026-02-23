<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md.flex
    div.fit
      .row.q-gutter-lg
        h5.q-ma-lg
          span Serveur SMPP&nbsp;
          small (envoi des SMS)
      .row.q-col-gutter-md
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.host"
          label="Serveur SMPP (URL smpp://...)"
          hint="Exemple : smpp://smpp.server.com:port"
          :error="!!validations['host']"
          :error-message='validations["host"]'
          dense
        )
        .offset-md-1
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.systemId"
          label="System ID"
          hint="Identifiant de connexion au serveur SMPP"
          :error="!!validations['systemId']"
          :error-message='validations["systemId"]'
          dense
        )
        .offset-md-1
        q-input.col-12.col-md-6(
          :type="typePasswordProp"
          outlined
          v-model="payload.password"
          label="Mot de passe"
          hint="Mot de passe de connexion au serveur SMPP"
          :error="!!validations['password']"
          :error-message='validations["password"]'
          dense
        )
          template(v-slot:append)
            q-icon.cursor-pointer(name="mdi-eye" @click="togglePassword")
        .offset-md-1
        q-input.col-12.col-md-6(
          type="text"
          outlined
          v-model="payload.sourceAddr"
          label="Nom ou numéro de l'emetteur"
          hint="Nom ou numéro qui apparaîtra comme expéditeur des SMS"
          :error="!!validations['sourceAddr']"
          :error-message='validations["sourceAddr"]'
          dense
        )
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

type SmsSettings = {
  host: string
  systemId: string
  password: string
  regionCode: string
  sourceAddr: string
}

export default defineComponent({
  name: 'SettingsSmsPage',
  data() {
    return {
      typePasswordProp: 'password',
    }
  },
  async setup() {
    const { handleError } = useErrorHandling()

    const payload = ref({
      host: '',
      systemId: '',
      password: '',
      regionCode: 'FR',
      sourceAddr: '',
    })
    const validations = ref({} as Record<string, any>)

    const {
      data: result,
      pending,
      error,
      refresh,
    } = await useHttp<{ data: SmsSettings }>(`/settings/sms/get`, {
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
        await this.$http.post(`/settings/sms/set`, {
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
