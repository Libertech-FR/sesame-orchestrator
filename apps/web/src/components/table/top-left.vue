<template lang="pug">
q-btn-group(rounded flat)
  //- q-btn(flat icon="mdi-merge" color="primary" rounded @click="merge" size="md" :disable="true ||selected.length === 0 || selected.length === 1")
  //-   q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Fusionner les identités sélectionnées
  //- q-btn(flat icon="mdi-check" color="primary" rounded @click="openUpdateModale(IdentityState.TO_VALIDATE)" size="md" :disable="selected.length === 0")
  //-   q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Valider les identités sélectionnées
  q-btn(flat icon="mdi-sync" color="orange-8" rounded @click="openUpdateModale" size="md" :disable="selected.length === 0")
    q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Mettre à synchroniser les identités sélectionnées
  q-btn(flat icon="mdi-email-arrow-right" color="primary" rounded @click="openInitModale" size="md" :disable="selected.length === 0")
    q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Envoyer le mail d'invitation
  q-btn(flat icon="mdi-close" color="negative" rounded @click="clearSelection" size="md" :disable="selected.length === 0")
    q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Nettoyer la selection
</template>

<script lang="ts" setup>
import type { components } from '#build/types/service-api'
import type { PropType } from 'vue'
import { useRouter } from 'nuxt/app'
import updateIdentityModale from '../updateIdentityModale.vue'
import updateInitModale from '../updateInitModale.vue'
import { useIdentityStates } from '#imports'
import { IdentityState } from '~/composables'
import { useIdentityStateStore } from '~/stores/identityState'
import {computed} from "vue";

const $q = useQuasar()

const props = defineProps({
  selected: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  total: {
    type: Number,
    default:0
  }
})

const emit = defineEmits(['updateLifestep', 'clear', 'refresh'])
const { getToSyncCount, fetchAllStateCount } = useIdentityStateStore()

const { getStateName } = useIdentityStates()
const { getStateValue } = useIdentityStateStore()
// function updateLifestep(lifestep: LifeStep) {
//   emit('updateLifestep', { identity: props.selected, lifestep })
// }

const route = useRoute()

function openUpdateModale() {
  const query = route.query || {}
  // console.log('filters', route.query)
  // console.log('props.selected', props.selected)
  // const identityState: IdentityState = parseInt(`${query['filters[@state][]']}`, 10)
  const identityState: IdentityState = props.selected[0].state
  if (typeof identityState !== 'number') {
    console.error('Invalid state', identityState)
    return
  }
  console.log('openUpdateModale', identityState)

  const name = getStateName(identityState)
  const count = getStateValue(identityState)

  $q.dialog({
    component: updateIdentityModale,
    componentProps: {
      selectedIdentities: props.selected,
      identityTypesName: name,
      allIdentitiesCount: props.total,
    },
  })
    .onOk(async (data) => {
      console.log('syncIdentities', data)
      data.syncAllIdentities ? await updateAllIdentities(identityState) : await updateIdentity(props.selected, identityState)
    })
    .onCancel(() => {
      console.log('cancelSync')
    })
}
function returnFilter(){
  const rest  = route.query
  let filters={}
  for (const [key, value] of Object.entries(rest)){
    if (key === 'limit' || key === 'skip' || key === 'sort' || key === 'read'){
      delete rest[key]
    }
  }

  return rest
}
function openInitModale() {
  // console.log('filters', route.query)
  // console.log('props.selected', props.selected)
  // const identityState: IdentityState = parseInt(`${query['filters[@state][]']}`, 10)
  const identityState: IdentityState = props.selected[0].state
  if (typeof identityState !== 'number') {
    console.error('Invalid state', identityState)
    return
  }
  console.log('openInitModale', identityState)

  const name = getStateName(identityState)


  $q.dialog({
    component: updateInitModale,
    componentProps: {
      selectedIdentities: props.selected,
      identityTypesName: name,
      allIdentitiesCount: props.total,
    },
  })
    .onOk(async (data) => {
      if (data.initAllIdentities === true){
        await sendInitToAllIdentities()
      }else{
        await sendInitToIdentity(props.selected)
      }
    })
    .onCancel(() => {
    })
}
function getTargetState(state: IdentityState) {
  switch (state) {
    case IdentityState.TO_VALIDATE:
      return IdentityState.TO_SYNC

    case IdentityState.ON_ERROR:
      return IdentityState.TO_SYNC
    case IdentityState.SYNCED:
      return IdentityState.TO_SYNC
    default:
      return state
  }
}

async function updateAllIdentities(state: IdentityState) {
  debugger
  const f=returnFilter()
  const { data: identities } = await useHttp(`/management/identities?limit=999999&&filters[@state][]=${state}`, {
    method: 'get',
    query:f
  })

  if (!identities) {
    $q.notify({
      message: 'Aucune identité à mettre à jour',
      color: 'negative',
    })
    return
  }
  updateIdentity(identities.value.data, state)
}

async function updateIdentity(identities, state: IdentityState) {
  const targetState = getTargetState(state)

  console.log('updateIdentity', identities)
  const ids = identities.map((identity) => identity._id)
  const { data, error } = await useHttp(`/management/identities/state`, {
    method: 'patch',
    body: {
      ids,
      originState: state,
      targetState,
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
  await fetchAllStateCount()
  emit('refresh')
  emit('clear')
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
  await fetchAllStateCount()
  emit('refresh')
  emit('clear')
}

async function sendInitToAllIdentities() {
  const { data: identities } = await useHttp('/management/identities?limit=99999', {
    method: 'get',
    query:returnFilter()
  })
  if (!identities) {
    $q.notify({
      message: 'Aucune identité trouvée',
      color: 'negative',
    })
    return
  }
  sendInitToIdentity(identities.value.data)
}



function clearSelection() {
  emit('clear')
}

function markAsRead() {
  console.log('markAsRead')
}

function merge() {
  console.log('merge')
}

function goToIdentity(identity) {
  useRouter().push(`/identity/${identity._id}`)
}
</script>
