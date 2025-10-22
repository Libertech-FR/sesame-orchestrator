<template lang="pug">
q-card.col-4.shadow-24.row(style="max-width: 1200px;")
  q-toolbar.bg-primary.text-white
    q-toolbar-title Connexion
  q-card-section.col-4.flex.items-center
    q-img(src="/config/login-side.png" error-src="/default.png" alt="Ecole logo" style="max-width: 100%;")
  q-card-section.col-8.column
    form(@submit.prevent='submit')
      q-card.no-shadow
        q-card-section.q-pt-sm.q-px-lg.q-pb-lg
          q-input(v-model="formData.username" label="Username" type="text")
          q-input(v-model="formData.password" label="Password" type="password" auto-complete='current-password')
        q-inner-loading(:showing='pending')
          q-spinner-grid(color='primary' size='50px')
      q-card-actions.column.justify-between
        .col.q-my-sm.flex.items-center
          q-btn(@click.prevent='submit' type='submit' color='primary' size="lg" ) Se connecter

</template>

<script lang="ts" setup>
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
    await useAuth().loginWith('local', {
      body: formData.value,
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
</script>
