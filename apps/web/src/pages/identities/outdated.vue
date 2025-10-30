<template>
  <q-table
    flat bordered
    title="Identités dont l'invitation n'est plus valide"
    dense
    :rows="rows1"
    :columns="fieldsName"
    selection="multiple"
    v-model:selected="selected"
    row-key="uid"
    :rows-per-page-options="[20,50,0]"
    rows-per-page-label="Lignes par page"
    no-data-label="Aucune donnée"
    loading-label="Chargement..."
    no-results-label="Aucun résultat"
    :pagination-label="(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`"
    :selected-rows-label="(numberOfRows) => `${numberOfRows} entrée(s) sélectionnée(s)`"
  >
    <template v-slot:top-left>
      <q-btn color="primary" icon="mdi-email-sync" size="md" flat rounded @click="openInitModale" :disable="selected.length === 0">
        <q-tooltip class="text-body2" transition-show="scale" transition-hide="scale">Réenvoyer le mail d'invitation</q-tooltip>

      </q-btn>
    </template>
  </q-table>
</template>

<script setup>
import {ref} from "vue";
import updateInitModale from "../../components/updateInitModale.vue";
import {useQuasar} from "quasar";
let rowsCount=0
const selected=ref([])
const $q=useQuasar()
const { data: fieldsName, pending1, error1} = await useHttp('/management/identities/validation', {
  method: 'GET',
  transform: (result)=>{
    const allFields=result.data.flatMap((enr)=>{
      return Object.keys(enr[enr.name].properties)
    })

    return allFields.map((enr)=>{
      return {name:enr,field:enr,label:enr,align: 'left'}
    })
  }
});

const { data: rows1, pending, error, refresh } = await useHttp('/management/passwd/ioutdated', {
  method: 'GET',
  transform: (result)=>{
    rowsCount=result.data.length
    const allFields=result.data.map((enr)=>{
      let addF={}
      for (const [key, value] of Object.entries(enr?.additionalFields?.attributes||{})) {
        addF = {...addF, ...value}
      }
      const step1={_id:enr._id,...enr.inetOrgPerson,...addF}
      return step1
    })
    return allFields
  }
});

function openInitModale() {
  $q.dialog({
    component: updateInitModale,
    componentProps: {
      selectedIdentities: selected.value,
      identityTypesName: name,
      allIdentitiesCount: rows1.value.length
    },
  })
    .onOk(async (data) => {
      console.log('initIdentities', data)
      data.initAllIdentities ? await sendInitToAllIdentities() : await sendInitToIdentity(selected.value)
    })
    .onCancel(() => {
      console.log('cancelinit')
    })
}
async function sendInitToIdentity(identities) {

  console.log('updateIdentity', identities)
  const ids = identities.map((identity) => identity._id)
  const { data, error } = await useHttp(`/management/passwd/initmany`, {
    method: 'post',
    body: {
      ids
    },
  })

  if (error.value) {
    $q.notify({
      message: error.value.data.message,
      color: 'negative',
    })
    return
  }

  $q.notify({
    message: `Les identités ont été mises à jour avec succès`,
    color: 'positive',
  })
  emit('refresh')
  emit('clear')
}

async function sendInitToAllIdentities() {
  const { data: identities } = await useHttp('/management/passwd/ioutdated', {
    method: 'get',
  })

  if (!identities) {
    $q.notify({
      message: 'Aucune identité trouvée',
      color: 'negative',
    })
    return
  }
  sendInitToIdentity(identities.value.data, state)
}



</script>

<style scoped>

</style>
