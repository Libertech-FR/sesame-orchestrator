<template>
  <q-table
    flat bordered
    title="Identités doubles"
    dense
    :rows="rows1"
    :columns="fieldsName"
    row-key="k"
    :rows-per-page-options="[20,50,0]"
    rows-per-page-label="Lignes par page"
    no-data-label="Aucune donnée"
    loading-label="Chargement..."
    no-results-label="Aucun résultat"
  >
    <template v-slot:body="props">
      <q-tr :props="props">
        <q-td
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
        >
            <template v-if="col.name === 'id1'" >
            <q-btn round size="sm" color="green" icon="mdi-account-edit" @click="edit(col.value,'text-positive')">
              <q-tooltip class="text-body2">Editer l'identité</q-tooltip>
            </q-btn>
              <q-btn round size="sm" color="green" icon="mdi-account-multiple" @click="fusion1(props.cols[0].value,props.cols[5].value)">
                 <q-tooltip class="text-body2">fusionner les deux identités</q-tooltip>
              </q-btn>
              <q-btn round size="sm" color="green" icon="mdi-account-remove" @click="deleteDialog(props.cols[0].value,props.cols[5].value)">
                <q-tooltip class="text-body2">supprimer l'identité</q-tooltip>
              </q-btn>
          </template>
            <template v-else-if="col.name === 'id2'">
            <q-btn round size="sm" color="red" icon="mdi-account-edit" @click="edit(col.value,'text-negative')">
              <q-tooltip class="text-body2">Editer l'identité</q-tooltip>
            </q-btn>
              <q-btn round size="sm" color="red" icon="mdi-account-multiple" @click="fusion1(props.cols[5].value,props.cols[0].value)">
                <q-tooltip class="text-body2">fusionner les deux identités</q-tooltip>
              </q-btn>
               <q-btn round size="sm" color="red" icon="mdi-account-remove" @click="deleteDialog(props.cols[5].value,props.cols[0].value)">
                  <q-tooltip class="text-body2">supprimer l'identité</q-tooltip>
               </q-btn>
          </template>
            <template v-else>
              {{ col.value  }}
          </template>

        </q-td>
      </q-tr>
    </template>
  </q-table>
  <q-dialog v-model="editForm" full-width full-height persistent>
    <q-card>
    <q-card-section class="row items-center q-pb-none">
      <h6 :class="cnColor">{{ cn }}</h6>
      <q-space></q-space>
      <q-btn class="q-mx-xs"  icon="mdi-check" color="positive" @click="submit">
        <q-tooltip>Enregistrer</q-tooltip>
      </q-btn>
      <q-btn class="q-mx-xs" icon="mdi-close" color="negative" @click="closeModal" >
        <q-tooltip>Quitter</q-tooltip>
      </q-btn>
    </q-card-section>
    <q-card-section>
      <sesame-identity-form
        :identity="identity"
        ref="form"
        @submit="submit($event)"
      >
      </sesame-identity-form>
    </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script setup>
import {ref} from "vue";
import {useQuasar} from "quasar";
import { useRouter } from 'vue-router'
const router=useRouter()
const $q=useQuasar()
const editForm=ref(false)
const identity=ref(null)
const cn=ref("")
const cnColor=ref("text-positive")
const refreshWindows=ref(false)
const rows=[]
const form=ref(null)
//attention si l'ordre des colonnes changent changer le @click des boutons fusion
const fieldsName=[
  {name:'id1',label:'action',field:'id1', align: 'center',classes:"leftidlight"},
  {name:'uid1',label:'identité 1',field:'uid1', align: 'left',classes:"leftid"},
  {name:'cn1',label:'Nom Prenom 1',field:'cn1', align: 'left',classes:"leftidlight"},
  {name:'employeeNumber1',label:'Numero',field:'employeeNumber1', align: 'left',classes:"leftidlight"},
  {name:'departmentNumber1',label:'Departement',field:'departmentNumber1', align: 'left',classes:"leftidlight"},
  {name:'id2',label:'action',field:'id2', align: 'center',classes:"rightidlight"},
  {name:'uid2',label:'identité 2',field:'uid2', align: 'left',classes:"rightid"},
  {name:'cn2',label:'Nom Prenom 2',field:'cn2', align: 'left',classes:"rightidlight"},
  {name:'employeeNumber2',label:'Numero',field:'employeeNumber2', align: 'left',classes:"rightidlight"},
  {name:'departmentNumber2',label:'Departement',field:'departmentNumber2', align: 'left',classes:"rightidlight"},
]
const actions = {
  read: async (id) => {
    const data = await $http.get(`/management/identities/` + id , {
      method: 'get',
    })
    return {...data._data?.data}
  }
}
const { data: rows1, pending, error, refresh } = await useHttp('/management/identities/duplicates', {
  method: 'GET',
  transform: (result)=>{

    const allFields=result.data.map((enr)=>{
        return {
          k:enr.k,
          id1:enr.data.at(0)._id,
          uid1:enr.data.at(0).uid,
          cn1:enr.data.at(0).cn,
          employeeNumber1:enr.data.at(0).employeeNumber,
          departmentNumber1:enr.data.at(0).departmentNumber.join(','),
          id2:enr.data.at(1)._id,
          uid2:enr.data.at(1).uid,
          cn2:enr.data.at(1).cn,
          employeeNumber2:enr.data.at(1).employeeNumber,
          departmentNumber2:enr.data.at(1).departmentNumber.join(','),
        }
        //return { k: enr.k, uid1: enr.data[Ø].uid, cn1:enr.data[0].cn, uid2: enr.data[1].uid, cn2:enr.data[1].cn,}
    })
    console.log("RESULT " + allFields)
    return allFields
  }
});
async function edit(id,colorClass){
  identity.value=await actions.read(id)
  cnColor.value=colorClass
  cn.value=identity.value.inetOrgPerson.cn
  editForm.value=true
}

async function fusion1(id1,id2){
  $q.dialog({
    title: 'Fusion des deux identités',
    message: 'Voulez-vous fusionner ces deux identités ?',
    persistent: true,
    html: true,
    ok: {
      push: true,
      color: 'positive',
      label: 'Fusionner',
    },
    cancel: {
      push: true,
      color: 'negative',
      label: 'Annuler',
    },
  }).onOk(async () => {
    const requestOptions={method: 'POST',
      body:JSON.stringify({id1:id1,id2:id2})}
    const data=await $http.post('/management/identities/fusion', requestOptions)
      .catch(error => {
        console.error('There was an error!', error);
      })
    edit(data._data.newId,"dark")
  })
}

async function submit() {
  form.value.submit()
  refreshWindows.value=true
}
function closeModal(){
  editForm.value=false
  refresh()
}
async function deleteDialog(id){
  $q.dialog({
    title: 'supprimer cette identité',
    message: 'Voulez-vous supprimer cette identité ?',
    persistent: true,
    html: true,
    ok: {
      push: true,
      color: 'positive',
      label: 'Supprimer',
    },
    cancel: {
      push: true,
      color: 'negative',
      label: 'Annuler',
    },
  }).onOk(async () => {
    const data=await deleteIdentity(id)
    refresh()
  })
}
async function deleteIdentity(id) {
  await $http.post('/core/backends/delete', {
    method: 'POST',
    body: {
      payload: [
        id,
      ],
    },
  }).catch(error => {
    console.error('There was an error!', error);
  })
}
</script>
<style>
.leftid {
  color:white;
  background:green !important;
}
.leftidlight {
  color:black;
  background: #cfe4d4 !important;
}
.rightid {
  color:white;
  background:darkred !important;
}
.rightidlight {
  color:black;
  background: #ecd6d6 !important;
}
</style>
