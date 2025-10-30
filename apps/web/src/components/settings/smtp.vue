<template>
  <div>
  <div class="row q-gutter-lg">
    <h5>Serveur SMTP (envoi des courriels)</h5>
  </div>
  <div class="q-pa-md q-gutter-md">
    <div class="row">
      <q-input style="width:50%" type="text" outlined v-model="host"   label="Serveur SMTP (URL smtp://...) " dense/>
    </div>
    <div class="row">
      <q-input style="width:50%" type="text" outlined v-model="emetteur"   label="Adresse emetteur" dense/>
    </div>
    <div class="row">
      <q-input style="width:50%" type="text" outlined v-model="username"   label="Compte SMTP" dense/>
    </div>
    <div class="row">
      <q-input style="width:50%" :type="typePasswordProp" outlined v-model="password"   label="Mot de passe" dense>
        <template v-slot:append>
          <q-icon name="mdi-eye" @click="togglePassword" style="cursor: pointer;"/>
        </template>
      </q-input>
    </div>
    <div class="q-pa-md q-gutter-sm fixed-bottom">
      <q-btn color="primary" style="width: 100%" @click="saveParams">
        <div class="ellipsis">
          Sauvegarder les parametres
        </div>
      </q-btn>
    </div>
  </div>
  </div>
</template>

<script setup>
import {onMounted, ref} from "vue";
import {useQuasar} from "quasar";
const { handleError } = useErrorHandling()
const $q=useQuasar()
const host=ref('')
const username=ref('')
const password=ref('')
const emetteur=ref('')
const typePasswordProp=ref('password')
onMounted(() => {
  readParams()
})
async function readParams(){
  console.log('readParams')
  const { data: result, pending, error, refresh } = await useHttp(`/settings/mail/get`, {
    method: 'GET',
  });
  if (error.value) {
    handleError({
      error: error.value,
      message: 'Erreur lors de de la lecture des paramètres'
    })
  } else {
    host.value=result.value.data.host
    emetteur.value=result.value.data.sender
    username.value=result.value.data.username
    password.value=result.value.data.password
  }
}
async function saveParams() {
  const data = {
    host: host.value,
    sender: emetteur.value,
    username: username.value,
    password: password.value

  }
  const {data: result, pending, error, refresh} = await useHttp(`/settings/mail/set`, {
    method: 'POST',
    body: data
  });
  if (error.value) {
    handleError({
      error: error.value,
      message: 'Erreur lors de la sauvegarde des parametres',
      notify: true
    })

  } else {
    $q.notify({
      message: 'Les parametres ont été sauvegardés',
      color: 'positive',
      position: 'top-right',
      icon: 'mdi-check-circle-outline',
    })
  }
}
function togglePassword(){
  if (typePasswordProp.value === 'password'){
    typePasswordProp.value='text'
  }else{
    typePasswordProp.value='password'
  }
}
</script>

<style scoped>

</style>
