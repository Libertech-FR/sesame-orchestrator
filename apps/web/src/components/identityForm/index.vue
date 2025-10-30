<template lang="pug">
div
  //- pre(v-html="JSON.stringify(identity, null, 2)")
  q-tabs(v-model="tab" align="justify" outside-arrows mobile-arrows inline-label dense)
    q-tab(name="inetOrgPerson" label="inetOrgPerson" :alert="getTabValidations('inetOrgPerson')" alert-icon="mdi-alert" :class="`q-mr-xs`")
    q-tab.q-pr-none(v-for="tab in tabs" :key="tab" :name="tab" :alert="getTabValidations(tab)" alert-icon="mdi-alert" :class="`q-mr-xs`")
      div.flex.row.full-height.items-center(style='flex-wrap: nowrap;')
        .q-tab__label(v-text='tab')
        q-btn.q-ml-sm(icon='mdi-delete-circle' flat color='negative' @click.native.stop="removeTab(tab)" size="sm" dense stretch)
    q-btn-dropdown.full-height(icon="mdi-newspaper-plus" flat)
      q-tooltip.text-body2(anchor="top middle" self="center middle") Ajouter un schéma
      q-list
        q-item(clickable v-close-popup v-for="schema in schemas" @click="addSchema(schema)")
          q-item-section
            q-item-label(v-text="schema.name")
  q-tab-panels(v-model="tab" keep-alive)
    q-tab-panel(name="inetOrgPerson")
      sesame-json-form-renderer-api(
        v-if='identity.inetOrgPerson'
        schemaName="inetOrgPerson"
        v-model:data="identity.inetOrgPerson"
        v-model:validations="validations"
        :isNew="isNew"
      )
    q-tab-panel(v-for="t in tabs" :key="t" :name="t")
      //- pre(v-html="JSON.stringify(identity.additionalFields.attributes[t], null, 2)")
      sesame-json-form-renderer-api(
        v-if='identity.additionalFields.attributes[t]'
        :schemaName="t"
        v-model:data="identity.additionalFields.attributes[t]"
        v-model:validations="validations"
        :isNew="isNew"
      )
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { IdentityState } from '~/constants'
import { useQuasar } from 'quasar'
import type { components, operations } from '#build/types/service-api'
import { useRouter } from 'vue-router'
import { useFetch } from 'nuxt/app'
import { useIdentityStates } from '~/composables'
import { useErrorHandling } from '#imports'

defineOptions({ name: 'IdentityForm' })

type IdentityResponse = operations['IdentitiesController_search']['responses']['200']['content']['application/json']
type Identity = components['schemas']['IdentitiesDto'] & { _id: string }

const props = defineProps({
  identity: { type: Object as PropType<Identity>, required: true, default: { additionalFields: { objectClasses: [], attributes: {} } } },
  isNew: { type: Boolean, default: false },
})

watch(
  () => props.identity._id,
  (id) => {
    if (!props.identity.additionalFields?.objectClasses.includes(tab.value)) {
      tab.value = 'inetOrgPerson'
    }
  },
)

const emits = defineEmits(['refreshTarget'])

const $q = useQuasar()
const router = useRouter()
const { getStateColor, getStateName } = useIdentityStates()
const { handleError } = useErrorHandling()

const identity = ref<Identity>(props.identity)
const tabs = ref(props.identity?.additionalFields?.objectClasses ?? [])
const validations = ref<Record<string, unknown> | null>(props.identity?.additionalFields?.validations ?? {})

provide('identityForm', identity)

watch(
  () => props.identity,
  () => {
    identity.value = props.identity
    tabs.value = props.identity?.additionalFields?.objectClasses ?? []
    validations.value = props.identity?.additionalFields?.validations ?? null
  },
)

const tab = ref('inetOrgPerson')
const error = ref(null)

const { data: schemasResult, pending, refresh } = await useHttp<any>(`/management/identities/validation`, { method: 'GET' })

const schemas = computed(() => {
  return schemasResult.value.data.filter((schema: any) => {
    return !tabs.value.includes(schema.name) && `${schema.name}`.toLocaleLowerCase() !== 'inetOrgPerson'.toLocaleLowerCase()
  })
})

async function addSchema(schema) {
  // console.log('identity.value', identity.value)
  if (!identity.value.additionalFields) identity.value.additionalFields = { objectClasses: [], attributes: {} }
  if (!identity.value.additionalFields.objectClasses) identity.value.additionalFields.objectClasses = []
  if (!identity.value.additionalFields.attributes) identity.value.additionalFields.attributes = {}
  identity.value.additionalFields.attributes[schema.name] = {}
  identity.value.additionalFields.objectClasses.push(schema.name)
  tab.value = schema.name
}

async function submit() {
  const sanitizedIdentity = { ...props.identity }
  delete sanitizedIdentity.metadata
  if (sanitizedIdentity?.additionalFields?.validations) delete sanitizedIdentity.additionalFields.validations

  const { data: result, pending, error, refresh } = await useHttp<any>(`/management/identities/${props.identity._id}`, { method: 'PATCH', body: sanitizedIdentity })
  if (error.value) {
    console.log('error', error.value.data.validations)
    validations.value = { ...error.value.data.validations }
    // error.value = error.value.cause.response._data
    handleError({ error: error.value, message: 'Erreur lors de la sauvegarde' })
  } else {
    validations.value = null
    $q.notify({ message: 'Sauvegarde effectuée', color: 'positive', position: 'top-right', icon: 'mdi-check-circle-outline' })
    emits('refreshTarget', { ...result.value.data })
  }
}

async function create() {
  console.log('create from form')
  const sanitizedIdentity = { ...props.identity }
  delete sanitizedIdentity.metadata

  const { data: result, pending, error, refresh } = await useHttp(`/management/identities`, { method: 'POST', body: { ...sanitizedIdentity } })
  if (error.value) {
    handleError({ error: error.value, message: 'Erreur lors de la création' })
    console.log('error', error.value.data.validations)
    validations.value = { ...error.value.data.validations }
  } else {
    $q.notify({ message: 'Création effectuée', color: 'positive', position: 'top-right', icon: 'mdi-check-circle-outline' })
    emits('refreshTarget', {})
  }
}

const stateName = computed(() => {
  const state = props.identity?.state
  return getStateName(state)
})

const stateColor = computed(() => {
  const state = props.identity?.state
  return getStateColor(state)
})

function getTabValidations(tab: string) {
  return validations.value?.hasOwnProperty(tab) ? 'red' : false
}

async function deleteIdentity() {
  const { data: result, pending, error, refresh } = await useHttp('/core/backends/delete', { method: 'POST', body: { payload: [props.identity._id] } })
  if (error.value) {
    // Handle error during sync
  } else {
    $q.notify({ message: 'Identité supprimée', color: 'positive', position: 'top-right', icon: 'mdi-check-circle-outline' })
    emits('refreshTarget', result.value.data)
    // props.identity. = result.value.data
  }
}

async function sync() {
  const {
    data: result,
    pending,
    error,
    refresh,
  } = await useHttp<any>(`/management/identities/${props.identity._id}/state`, { method: 'PATCH', body: { state: IdentityState.TO_SYNC } })

  if (error.value) {
    // Handle error during sync
  } else {
    $q.notify({ message: 'Mise en état, à synchroniser', color: 'positive', position: 'top-right', icon: 'mdi-check-circle-outline' })
    emits('refreshTarget', result.value.data)
    // props.identity. = result.value.data
  }
}

function removeTab(t) {
  $q.dialog({
    title: 'Suppression',
    message: 'Voulez-vous supprimer ce schéma ?',
    persistent: true,
    ok: { push: true, color: 'negative', label: 'Supprimer' },
    cancel: { push: true, color: 'primary', label: 'Annuler' },
  }).onOk(() => {
    const index = tabs.value.indexOf(t)
    tabs.value.splice(index, 1)
    if (identity.value?.additionalFields?.attributes[t]) {
      delete identity.value.additionalFields.attributes[t]
    }
    tab.value = 'inetOrgPerson'
  })
}

function logs() {
  console.log('logs')
}

function back() {
  router.push('/identities')
}

defineExpose({ submit, create, sync, logs, back, deleteIdentity })
</script>

<style scoped>
/* Your styles here */
</style>
