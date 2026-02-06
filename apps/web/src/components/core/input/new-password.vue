<template>
  <div>
    <div class="col-12">
      <q-input @update:model-value="checkPassword($event,'pass')" :label-color="pwdColor" v-model="newPassword"
               label="Nouveau mot de passe" :type="typePasswordProp">
        <template v-slot:append>
          <q-icon name="mdi-eye" @click="togglePassword" style="cursor: pointer;"/>
        </template>

      </q-input>
      <q-input @update:model-value="checkPassword($event,'confirm')" v-model="confirmNewPassword" :label-color="confirmColor"
               label="Confirmation du nouveau mot de passe" :type="typeConfirmProp">
        <template v-slot:append>
          <q-icon name="mdi-eye" @click="toggleConfirm" style="cursor: pointer;"/>
        </template>
      </q-input>
    </div>
    <div class="col-12">
      <p style="margin: 0px;">
        <q-icon :name="has_len" :color="has_len_color" size="xs" style="margin: 0px;"></q-icon>
        &nbsp;doit avoir au moins {{min}} caractères
      </p>
      <p  style="margin: 0px;">
        <q-icon  :name="has_upper" :color="has_upper_color" size="xs" ></q-icon>
        &nbsp;doit comporter au moins {{minUpper}} majuscules
      </p>
      <p v-show="minLower > 0" style="margin: 0px;">
        <q-icon  :name="has_lower" :color="has_lower_color" size="xs" ></q-icon>
        &nbsp;doit comporter au moins {{minLower}} minuscules
      </p>
      <p  v-show="minNumber > 0" style="margin: 0px;">
        <q-icon  :name="has_number" :color="has_number_color" size="xs" ></q-icon>
        &nbsp;doit comporter au moins {{minNumber}} chiffre
      </p>
      <p v-show="minSpecial > 0" style="margin: 0px;">
        <q-icon  :name="has_special" :color="has_special_color" size="xs" ></q-icon>
        &nbsp;doit comporter au moins {{minNumber}} charactère special
      </p>
      <p v-show="minEntropy > 0" style="margin: 0px;">
        <q-icon  :name="has_complexity" :color="has_complexity_color" size="xs" ></q-icon>
        &nbsp; Complexité
        <br>
        <q-linear-progress :value="progress" :color="progress_color" class="q-mt-sm" size="10px" />
      </p>
      <p v-show="checkPwned">
        <q-icon  :name="isPwned" :color="isPwned_color" size="xs" ></q-icon>
        &nbsp; Exposition du mot de passe <a href="https://haveibeenpwned.com">haveiBeenPwned</a>
      </p>
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import {ref} from 'vue'
import stringEntropy from 'fast-password-entropy'
import { pwnedPassword } from 'hibp';
const emit = defineEmits(['update:modelValue'])
const $q = useQuasar()
const newPassword = ref('')
const confirmNewPassword = ref('')
const pwdColor = ref('')
const confirmColor = ref('')
const has_len=ref('mdi-alert-box')
const has_len_color=ref('red')
const has_upper=ref('mdi-alert-box')
const has_upper_color=ref('red')
const has_lower=ref('mdi-alert-box')
const has_lower_color=ref('red')
const has_number=ref('mdi-alert-box')
const has_number_color=ref('red')
const has_special=ref('mdi-alert-box')
const has_special_color=ref('red')
const has_complexity=ref('mdi-alert-box')
const has_complexity_color=ref('red')
const isPwned=ref('mdi-emoticon-neutral')
const isPwned_color=ref('grey')
const progress=ref(0)
const progress_color=ref('red')
const typePasswordProp=ref('password')
const typeConfirmProp=ref('password')
const minLower=ref(1)
const minUpper=ref(1)
const minNumber=ref(1)
const minSpecial=ref(1)
const minEntropy=ref(20)
const checkPwned=ref(false)
const min=ref(5)
const { data: props} = await useHttp('/management/passwd/getpolicies',
  {
    method:'GET',
    transform:(result)=> {
      return result.data
    }

  }
)
minLower.value=props.value.hasLowerCase
minUpper.value=props.value.hasUpperCase
minNumber.value=props.value.hasNumbers
minSpecial.value=props.value.hasSpecialChars
minEntropy.value=props.value.minComplexity
checkPwned.value=props.value.checkPwned
min.value=props.value.len
async function checkPassword(ev, type) {
  let newP = newPassword.value
  let confirmP = confirmNewPassword.value
  if (type === 'pass') {
    newP = ev
  } else {
    confirmP = ev
  }
  if (checkPolicy(newP) === true) {
    if (newP === confirmP) {
      console.log('emit ' + newPassword.value)
      //avant d accepter on cherche dans l api de pwned
      try{
        if (checkPwned.value === true ){
          const numPwns = await pwnedPassword(newP);

          if (numPwns >0){
            iconIsPwnedOK(false)
            $q.notify({
              message: '<text-weight-medium>Ce mot de passe est déjà apparu lors d\'une violation de données. Vous ne pouvez pas l\'utiliser</text-weight-medium>',
              html:true,
              color: 'negative',
              multiLine: true,
            })
            emit('update:modelValue', '')
            return
          }else{
            iconIsPwnedOK(true)
          }
          console.log('pwn :' + numPwns)
        }
      }catch(err){

      }


      confirmColor.value='green'
      emit('update:modelValue', newPassword.value)
    }else{
      emit('update:modelValue', '')
      confirmColor.value='red'
    }
  }else{
    emit('update:modelValue', '')
  }
}

function checkPolicy(password) {
  has_len.value='highlight_off'
  let statut=true
  if (minSpecial.value >= 1){
    if (/[!@#\$%\^\&*\)\(+=._-]/.test(password) === false){
      pwdColor.value = 'red'
      iconSpecialOK(false)
      statut=false
    }else{
      iconSpecialOK(true)
    }
  }
  if (minNumber.value >= 1) {
    if (/\d/.test(password) === false) {
      pwdColor.value = 'red'
      iconNumberOK(false)
      statut = false
    } else {
      iconNumberOK(true)
    }
  }
  if (minLower.value >= 1) {
    if (/[a-z]/.test(password) === false) {
      pwdColor.value = 'red'
      iconLowerOK(false)
      statut = false
    } else {
      iconLowerOK(true)
    }
  }
  if (minUpper.value >= 1) {
    if (/[A-Z]/.test(password) === false) {
      pwdColor.value = 'red'
      iconUpperOK(false)
      statut = false
    } else {
      iconUpperOK(true)
    }
  }
  if (password.length < min.value) {
    console.log('trop court ' + min.value)
    iconLenOK(false)
    statut=false
  }else{
    iconLenOK(true)
  }
  console.log('password OK ')
  if (statut === true){
    pwdColor.value = 'green'
  }else {
    pwdColor.value = 'red'
  }
  //entropie
  if (complexity(password) === false){
    statut=false
    iconComplexityOK(false)
  }else{
    iconComplexityOK(true)
  }
  return statut
}
function iconComplexityOK(value){
  if (value === true){
    has_complexity.value='mdi-check'
    has_complexity_color.value='green'
  }else{
    has_complexity.value='mdi-alert-box'
    has_complexity_color.value='red'
  }
}
function iconLenOK(value){
  if (value === true){
    has_len.value='mdi-check'
    has_len_color.value='green'
  }else{
    has_len.value='mdi-alert-box'
    has_len_color.value='red'
  }
}
function iconUpperOK(value){
  if (value === true){
    has_upper.value='mdi-check'
    has_upper_color.value='green'
  }else{
    has_upper.value='mdi-alert-box'
    has_upper_color.value='red'
  }
}
function iconLowerOK(value){
  if (value === true){
    has_lower.value='mdi-check'
    has_lower_color.value='green'
  }else{
    has_lower.value='mdi-alert-box'
    has_lower_color.value='red'
  }
}
function iconNumberOK(value){
  if (value === true){
    has_number.value='mdi-check'
    has_number_color.value='green'
  }else{
    has_number.value='mdi-alert-box'
    has_number_color.value='red'
  }
}
function iconSpecialOK(value){
  if (value === true){
    has_special.value='mdi-check'
    has_special_color.value='green'
  }else{
    has_special.value='mdi-alert-box'
    has_special_color.value='red'
  }
}
function iconIsPwnedOK(value){
  if (value === true){
    isPwned.value='mdi-emoticon'
    isPwned_color.value='green'
  }else{
    isPwned.value='mdi-emoticon-angry'
    isPwned_color.value='red'
  }
}
function complexity(password){
  console.log(stringEntropy(password))
  if (minEntropy.value > 0){
    let c = stringEntropy(password)
    progress.value = c / 100
    console.log('entropy' + c)
    if (c < props.value.minComplexity) {
      progress_color.value = 'red'
    } else if (c >= props.value.minComplexity && c < props.value.goodComplexity) {
      progress_color.value = 'warning'
    } else {
      progress_color.value = 'green'
    }
    if (c >= minEntropy.value) {
      return true
    } else {
      return false
    }
  }
}
function togglePassword(){
  if (typePasswordProp.value === 'password'){
    typePasswordProp.value='text'
  }else{
    typePasswordProp.value='password'
  }
}
function toggleConfirm(){
  if (typeConfirmProp.value === 'password'){
    typeConfirmProp.value='text'
  }else{
    typeConfirmProp.value='password'
  }
}
</script>

<style scoped>

</style>
