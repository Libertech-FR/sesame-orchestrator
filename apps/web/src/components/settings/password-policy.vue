<template>
  <div>
  <div class="row q-gutter-sm">
    <h5>Politique des mots de passe</h5>
  </div>
    <div class="q-pa-md q-gutter-md">

      <div class="row">
       <div class="col-4">
         <q-input type="number" outlined v-model="len"  input-class="text-right" label="Longueur minimale " dense> </q-input>
       </div>
        <div class="col-4">
          <q-input type="number" outlined v-model="minComplexity"  input-class="text-right" label="Entropie minimale " dense> </q-input>
        </div>
        <div class="col-4">
          <q-input type="number" outlined v-model="goodComplexity"  input-class="text-right" label="Entropie bonne " dense> </q-input>
        </div>


      </div>
      <div row="row">
        <q-toggle dense
          v-model="hasUpper"
          color="green"
          label="Doit contenir au moins une Majuscule"
        />
        </div>
        <div row="row">
          <q-toggle dense
            v-model="hasLower"
            color="blue"
            label="Doit contenir au moins une Minuscule"
          />
        </div>
      <div row="row">
        <q-toggle dense
          v-model="hasNumber"
          color="orange"
          label="Doit contenir au moins un chiffre"
        />
      </div>
      <div row="row">
        <q-toggle dense
          v-model="hasSpecialChars"
          color="blue"
          label="Doit contenir au moins un caractère special"
        />
      </div>
      <div row="row">
      <q-toggle dense
        v-model="checkPwned"
        color="black"
        label="Vérifier si le mot de pass est connu avec pwned "
      />
    </div>
      <div row="row">
        <q-toggle dense
          v-model="smsEnabled"
          color="red"
          label="Reinitialisation par SMS active"
        />
      </div>
      <div class="row">
        <q-input style="width:50%" type="text" outlined v-model="mailAttribute"   label="Attribut de l'identité contenant le mail alternatif " dense/>
      </div>
      <div class="row">
        <q-input style="width:50%" type="text" outlined v-model="mobileAttribute"   label="Attribut de l'identité contenant le numero de mobile " dense/>
      </div>
      <div class="row">
        <q-input style="width:50%" type="url" outlined v-model="redirectUrl"   label="Url de redirection après un changement de mot de passe " dense/>
      </div>
      <div class="row">
        <q-input style="width:30%" type="number" outlined v-model="resetCodeTTL"   label="Temps de vie du code de reninitialisation du code (en secondes)" dense/>
      </div>
      <div class="row">
        <q-input style="width:30%" type="number" outlined v-model="initTokenTTL"   label="Temps de vie du mail d'initialisation  (en secondes)" dense/>
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
const $q = useQuasar()
const len=ref(8)
const hasUpper = ref(false)
const hasLower = ref(false)
const hasNumber= ref(false)
const hasSpecialChars=ref(false)
const checkPwned=ref(false)
const smsEnabled=ref(false)
const mailAttribute=ref('')
const mobileAttribute=ref('')
const redirectUrl=ref('')
const goodComplexity=ref(0)
const minComplexity=ref(0)
const resetCodeTTL=ref(0)
const initTokenTTL=ref(0)
onMounted(() => {
  readParams()
})

async function readParams(){
  console.log('readParams')
  const { data: result, pending, error, refresh } = await useHttp(`/settings/passwdadm/getpolicies`, {
    method: 'GET',
  });
  if (error.value) {
    handleError({
      error: error.value,
      message: 'Erreur lors de de la lecture des police'
    })
  } else {
    redirectUrl.value=result.value.data.redirectUrl
    len.value=result.value.data.len
    hasUpper.value=result.value.data.hasUpperCase === 1
    hasLower.value=result.value.data.hasLowerCase === 1
    hasNumber.value=result.value.data.hasNumbers === 1
    hasSpecialChars.value=result.value.data.hasSpecialChars === 1
    smsEnabled.value=result.value.data.resetBySms
    checkPwned.value=result.value.data.checkPwned
    minComplexity.value=result.value.data.minComplexity
    goodComplexity.value=result.value.data.goodComplexity
    mobileAttribute.value=result.value.data.mobileAttribute
    mailAttribute.value=result.value.data.emailAttribute
    resetCodeTTL.value=result.value.data.resetCodeTTL
    initTokenTTL.value=result.value.data.initTokenTTL
  }
}
async function saveParams(){
  const data= {
      len: len.value,
      hasUpperCase: hasUpper.value === true?1:0,
      hasLowerCase:  hasLower.value === true?1:0,
      hasNumbers:  hasNumber.value === true?1:0,
      hasSpecialChars:  hasSpecialChars.value === true?1:0,
      minComplexity: minComplexity.value,
      goodComplexity: goodComplexity.value,
      checkPwned: checkPwned.value,
      resetBySms: smsEnabled.value,
      redirectUrl: redirectUrl.value,
      emailAttribute: mailAttribute.value,
      mobileAttribute: mobileAttribute.value,
      resetCodeTTL: resetCodeTTL.value,
      initTokenTTL: initTokenTTL.value
    }
  const { data: result, pending, error, refresh } = await useHttp(`/settings/passwdadm/setpolicies`, {
    method: 'POST',
    body: data
  });
  if (error.value) {
    handleError({
      error: error.value,
      message: 'Erreur lors de la sauvegarde des parametres'
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
</script>


<style scoped>

</style>
