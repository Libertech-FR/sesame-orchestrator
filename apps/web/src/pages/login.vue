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
      form.fit(@submit.prevent='submit')
        q-card-section.column.full-height
          .col.column.items-center.justify-center.q-gutter-md.q-pl-md
            q-input.full-width(
              v-model="formData.username"
              label="Nom d'utilisateur"
              type="text"
              :readonly='pending'
              autocomplete='username'
              outlined
            )
            q-input.full-width(
              v-model="formData.password"
              label="Mot de passe"
              type="password"
              autocomplete='current-password'
              :readonly='pending'
              outlined
            )
          q-card-actions.q-mt-md(
            stzyle='position: sticky; bottom: 0; right: 0; left: 0;'
          )
            q-space
            q-btn(
              @click.prevent='submit'
              type='submit'
              color='primary'
              size="lg"
              :loading='pending'
            ) Se connecter
            q-space
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
      }),
    }
  },
  methods: {
    async submit() {
      this.pending = true
      try {
        await useAuth().loginWith('local', {
          body: this.formData,
        })
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

<!-- <script lang="ts" setup>
import { ref } from 'vue'
import { useQuasar } from 'quasar'
definePageMeta({
  layout: 'simple-centered',
  auth: {
    unauthenticatedOnly: true,
    navigateAuthenticatedTo: '/',
  },
})

const $q = useQuasar()
const pending = ref(false)
const formData = ref({
  username: '',
  password: '',
})

const submit = async () => {
  pending.value = true
  try {
    await useAuth()
      .loginWith('local', {
        body: formData.value,
      })
      .catch(() => {
        throw new Error('Invalid credentials')
      })
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Erreur de connexion',
    })
  } finally {
    pending.value = false
  }
}
</script> -->

<style lang="sass" scoped>
::v-deep body.body--dark input:-webkit-autofill
  -webkit-box-shadow: 0 0 0px 1000px var(--q-dark) inset
  -webkit-text-fill-color: #fff !important
  caret-color: #fff !important
</style>
