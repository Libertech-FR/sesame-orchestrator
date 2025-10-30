<template lang="pug">
div.flex
  div
    q-btn.sesame.infinite.animated.flash(color="negative" @click="validationsModal = true" v-if="!isNew && hasValidations()" outline)
      q-tooltip.text-body2(slot="trigger") Afficher les erreurs
      q-icon.text-negative(name='mdi-alert-box')
    q-dialog(v-model="validationsModal")
      q-card(style="min-width: 350px")
        q-card-section.q-pa-sm.bg-negative.text-white.flex
          q-icon(name='mdi-alert-box' size="2rem")
          div.text-h6.q-ml-md Erreurs de validation
        q-card-section.q-py-sm
          q-list(separator)
            q-item(v-for="field in Object.keys(validations)" :key="field")
              q-item-section.text-negative
                q-item-label {{ field }}
                q-item-label(v-for='f in validations[field]' caption) - {{ f }}
        q-card-actions(align="right")
          q-btn(flat label="Fermer" color="primary" v-close-popup)
    q-btn(color="positive" icon='mdi-content-save-plus' @click="create" v-show="isNew" v-if="crud.create")
      q-tooltip.text-body2 Créer
    q-toggle.q-px-md.q-gutter-y-lg(
      v-if="props.identity?._id"
      checked-icon="mdi-account-check"
      unchecked-icon="mdi-account-cancel"
      indeterminate-icon="mdi-lock-reset"
      keep-color
      size="xl"
      @click="activate"
      :color="setActivateColor()"
      label="Activation"
      v-model="props.identity.dataStatus"
      :true-value="1"
      :indeterminate-value="-2"
      :false-value="-3"
      )
    q-btn-group(v-if="props.identity?._id" push flat)
      q-btn(@click="forceChangePassword()" color="orange-8" icon="mdi-lock-reset" :disabled="props.identity.state != IdentityState.SYNCED" padding='5px 10px' dense)
        q-tooltip.text-body2(slot="trigger") Obliger l'utilisateur à changer son mot de passe
      q-btn(@click="resetPasswordModal = true" color="red-8" icon="mdi-account-key" :disabled="props.identity.state != IdentityState.SYNCED" padding='5px 10px' dense)
        q-tooltip.text-body2(slot="trigger") Définir le mot de passe
      q-btn(@click="sendInit" color="primary" icon="mdi-email-arrow-right"  :disabled="props.identity.state != IdentityState.SYNCED" padding='5px 10px' dense)
        q-tooltip.text-body2(slot="trigger") Envoyer le mail d'invitation

      q-separator(size='3px' vertical)

      q-btn(@click="submit" color="positive" icon="mdi-check"  v-show="!isNew" v-if="crud.update")
        q-tooltip.text-body2(slot="trigger") Enregistrer les modifications
      q-btn(v-if="props.identity?._id" @click="sync" color="orange-8" :disabled="props.identity.state != IdentityState.TO_VALIDATE" icon="mdi-sync")
        q-tooltip.text-body2(slot="trigger" v-if="props.identity.state == IdentityState.TO_VALIDATE") Synchroniser l'identité
        q-tooltip.text-body2(slot="trigger" v-else) L'état de l'identité ne permet pas de la synchroniser

      q-separator(v-if="props.identity?._id" size='3px' vertical)

      div(ref='targetEl' style='display: height: 36px;')
        q-tooltip.text-body2(:target="targetEl" anchor="top middle" self="bottom middle") État du cycle de vie : {{ stateName }}
        q-btn-dropdown.q-pl-sm.full-height(icon='mdi-clock' color='purple-8' square unelevated dense)
          q-list
            q-item(
              v-for='stateItem in stateList' :key='stateItem.key'
              @click="switchLifecycle(stateItem.key)"
              :active='stateItem.key === props.identity.lifecycle'
              active-class="bg-purple-8 text-white"
              clickable v-close-popup
            )
              q-item-section(avatar)
                q-icon(:name="stateItem.icon || 'mdi-help-rhombus-outline'" :color="stateItem.color")
              q-item-section
                q-item-label
                  span(v-text='stateItem.label')
                  | &nbsp;
                  small(v-text='("(" + stateItem.key + ")")')
      q-separator(size='3px' vertical)

      q-btn-dropdown.text-white(v-if="props.identity?._id" dropdown-icon="mdi-dots-vertical" style='background-color: rgba(0, 0, 0, .6)' padding='5px 10px' dense no-caps)
        q-list
          a(:href="'/jobs?filters[:concernedTo.id]=' + props.identity?._id" target="_blank" style='text-decoration: none; color: inherit' @click.prevent="dialogLog = true")
            q-item(v-if="props.identity?._id" clickable v-close-popup)
              q-item-section(avatar)
                q-icon(name="mdi-file-document" color="grey-6")
              q-item-section
                q-item-label Voir les logs
              q-item-section(side)
                q-btn(icon="mdi-open-in-new" size='sm' flat dense @click.stop="open('/jobs?filters[:concernedTo.id]=' + props.identity?._id)")
          a(:href="'/lifecycles/' + props.identity?._id" target="_blank" style='text-decoration: none; color: inherit' @click.prevent="dialogLifecycle = true")
            q-item(v-if="props.identity?._id" clickable v-close-popup)
              q-item-section(avatar)
                q-icon(name="mdi-clock" color="purple-8")
              q-item-section
                q-item-label Voir le cycle de vie
              q-item-section(side)
                q-btn(icon="mdi-open-in-new" size='sm' flat dense @click.stop="open('/lifecycles/' + props.identity?._id)")
          q-separator(size='3px')
          q-item(v-if="props.identity?._id" clickable v-close-popup @click="deleteIdentity")
            q-item-section(avatar)
              q-icon(name="mdi-delete" color="negative")
            q-item-section
              q-item-label Supprimer l'identité

  q-dialog(v-model="dialogLog" full-height full-width persistent)
    q-card
      q-toolbar.absolute.bg-purple.text-white(dense)
        q-toolbar-title Journaux de l'identité {{ props.identity?.inetOrgPerson?.cn }}
        q-btn(icon="mdi-close" @click="dialogLog = false" dense flat)
      object.absolute.full-width(
        type="text/html"
        :data="'/jobs?filters[:concernedTo.id]=' + props.identity?._id + '&embedded=1'"
        style="height: calc(100% - 56px); margin-top: 50px; z-index: 1;"
      )
      .fit.items-center.column.justify-center
        q-circular-progress(indeterminate size='80px')
        span.q-mt-md Chargement en cours ...

  q-dialog(v-model="resetPasswordModal" persistent medium)
    q-card(style="width:800px")
      q-card-section(class="text-h6 bg-primary text-white") definition du mot de passe
      q-card-section
      input-new-password(v-model="newpassword")
      q-card-actions(align="right" class="bg-white text-teal")
        q-btn( label="Abandonner" color="negative" @click="resetPasswordModal = false" )
        q-btn( label="Sauver" color="positive" @click="doChangePassword" :disabled="newpassword === ''")

  q-dialog(v-model="dialogLifecycle" full-height full-width persistent)
    q-card
      q-toolbar.absolute.bg-purple.text-white(dense)
        q-toolbar-title Cycle de vie de l'identité {{ props.identity?.inetOrgPerson?.cn }}
        q-btn(icon="mdi-close" @click="dialogLifecycle = false" dense flat)
      object.absolute.full-width(
        type="text/html"
        :data="'/lifecycles/' + props.identity?._id + '?embedded=1'"
        style="height: calc(100% - 56px); margin-top: 50px; z-index: 1;"
      )
      .fit.items-center.column.justify-center
        q-circular-progress(indeterminate size='80px')
        span.q-mt-md Chargement en cours ...
</template>

<script lang="ts" setup>
import { computed, ref, type Prop } from 'vue'
import { IdentityState } from '~/constants'
import { useQuasar } from 'quasar'
import type { components, operations } from '#build/types/service-api'
import { useRouter } from 'vue-router'
import { useFetch } from 'nuxt/app'
import { useIdentityStates } from '~/composables'
import { useErrorHandling } from '#imports'
import InputNewPassword from '~/components/inputNewPassword.vue'
const resetPasswordModal = ref(false)
const forcePasswordModal = ref(false)

const targetEl = ref()
const newpassword = ref('')
type IdentityResponse = operations['IdentitiesController_search']['responses']['200']['content']['application/json']
type Identity = components['schemas']['IdentitiesDto']
const activation = ref(true)
const props = defineProps({
  identity: {
    type: Object as PropType<Identity>,
    required: true,
  },
  crud: {
    type: Object,
    default: {},
  },
  isNew: {
    type: Boolean,
    required: true,
  },
  refreshTarget: {
    type: Function,
  },
  validations: {
    type: Object,
    default: {},
  },
})

const $q = useQuasar()
const router = useRouter()
const { getStateColor, getStateName } = useIdentityStates()
const { getLifecycleColor, getLifecycleName, getLifecycleIcon, stateList } = await useIdentityLifecycles()
const { handleError } = useErrorHandling()

const emits = defineEmits(['submit', 'sync', 'logs', 'create', 'delete'])

const validationsModal = ref(false)

const dialogLog = ref(false)
const dialogLifecycle = ref(false)

async function switchLifecycle(lifecycle: string) {
  const requestOptions = { method: 'POST', body: JSON.stringify({ lifecycle }) }
  try {
    const data = await $http.patch(`/management/identities/${props.identity._id}/lifecycle`, requestOptions)
    $q.notify({
      message: 'Le cycle de vie a été mis à jour : ' + data._data?.data?.lifecycle,
      color: 'positive',
      position: 'top-right',
      icon: 'mdi-check-circle-outline',
    })
    props?.refreshTarget(props.identity)
  } catch (error) {
    $q.notify({
      message: 'Impossible de modifier le cycle de vie : ' + error.response._data.message,
      color: 'negative',
      position: 'top-right',
      icon: 'mdi-alert-circle-outline',
    })
  }
}

async function doChangePassword() {
  const requestOptions = { method: 'POST', body: JSON.stringify({ id: props.identity._id, newPassword: newpassword.value }) }
  try {
    const data = await $http.post('/management/identities/forcepassword', requestOptions)
    $q.notify({
      message: 'Le mot de passe a été changé : ',
      color: 'positive',
      position: 'top-right',
      icon: 'mdi-check-circle-outline',
    })
  } catch (error) {
    $q.notify({
      message: 'Impossible de modifier le mot de passe : ' + error.response._data.message,
      color: 'negative',
      position: 'top-right',
      icon: 'mdi-alert-circle-outline',
    })
  }
  resetPasswordModal.value = false
}

function hasValidations() {
  if (props.validations) {
    for (const field in props.validations) {
      if (Object.keys(props.validations[field]).length > 0) {
        return true
      }
    }
  }
  return false
}

async function submit() {
  // console.log('submit from actions')
  emits('submit')
}

async function create() {
  // console.log('submit from actions')
  emits('create')
}

function setActivateColor() {
  if (props.identity.dataStatus === 1) {
    return 'green'
  } else if (props.identity.dataStatus === -3) {
    return 'negative'
  } else {
    return 'grey'
  }
}

function showActivate() {
  if (props.identity.lastBackendSync != '') {
    return true
  } else {
    return false
  }
}

async function forceChangePassword() {
  $q.dialog({
    title: 'Confirmation',
    message: 'Voulez vous forcer le changement de mot de passe ? ',
    persistent: true,
    ok: {
      push: true,
      color: 'positive',
      label: 'Forcer',
    },
    cancel: {
      push: true,
      color: 'negative',
      label: 'Annuler',
    },
  }).onOk(async () => {
    const requestOptions = { method: 'POST', body: JSON.stringify({ id: props.identity._id }) }
    try {
      const data = await $http.post('/management/identities/needtochangepassword', requestOptions)
      $q.notify({
        message: 'LE changement de mot de passe est forcé : ',
        color: 'positive',
        position: 'top-right',
        icon: 'mdi-check-circle-outline',
      })
      props?.refreshTarget(props.identity)
    } catch (error) {
      $q.notify({
        message: 'Impossible de forcer le changement de mot de passe : ' + error.response._data.message,
        color: 'negative',
        position: 'top-right',
        icon: 'mdi-alert-circle-outline',
      })
    }
  })
}

async function activate() {
  let message = ''
  let bouton = ''
  let initialStatus = 0
  if (props.identity.dataStatus === 0) {
    message = "Voulez vous vraiment désactiver l'identité"
    bouton = 'Désactiver'
    initialStatus = 1
  } else {
    message = "Voulez vous vraiment activer l'identité"
    bouton = 'Activer'
    initialStatus = 0
  }
  if (showActivate() === false) {
    props.identity.dataStatus = initialStatus
    return
  }

  $q.dialog({
    title: 'Confirmation',
    message: message,
    persistent: true,
    ok: {
      push: true,
      color: 'positive',
      label: bouton,
    },
    cancel: {
      push: true,
      color: 'negative',
      label: 'Annuler',
    },
  })
    .onOk(async () => {
      const requestOptions = { method: 'POST', body: JSON.stringify({ id: props.identity._id, status: props.identity.dataStatus === 1 ? true : false }) }
      try {
        const data = await $http.post('/management/identities/activation', requestOptions)
        $q.notify({
          message: 'Le statut a été mis à jour : ',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
      } catch (error) {
        props.identity.dataStatus = initialStatus
        $q.notify({
          message: 'Impossible de modifier le statut : ' + error.response._data.message,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      }
    })
    .onCancel(() => {
      props.identity.dataStatus = initialStatus
    })
}

async function deleteIdentity() {
  $q.dialog({
    title: 'Confirmation',
    message: 'Voulez-vous vraiment supprimer cette identité ?',
    persistent: true,
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
  }).onOk(() => {
    emits('delete')
  })
}

const stateName = computed(() => {
  const state = props.identity?.state
  return getStateName(state)
})

const lifecycleName = computed(() => {
  const lifecycle = props.identity?.lifecycle
  return getLifecycleName(lifecycle)
})

const stateColor = computed(() => {
  const state = props.identity?.state
  return getStateColor(state)
})

const lifecycleColor = computed(() => {
  const lifecycle = props.identity?.lifecycle
  return getLifecycleColor(lifecycle)
})

const lifecycleIcon = computed(() => {
  const lifecycle = props.identity?.lifecycle
  return getLifecycleIcon(lifecycle)
})

async function sync() {
  emits('sync')
}

async function sendInit() {
  //envoi le mail

  const {
    data: result,
    pending,
    error,
    refresh,
  } = await useHttp(`/management/passwd/init`, {
    method: 'POST',
    body: { uid: props.identity.inetOrgPerson.uid },
  })
  if (error.value) {
    handleError({
      error: error.value,
      message: "Erreur lors de l'envoi du mail",
    })
  } else {
    $q.notify({
      message: 'Le mail a été envoyé',
      color: 'positive',
      position: 'top-right',
      icon: 'mdi-check-circle-outline',
    })
  }
}

function back() {
  router.push('/identities')
}

function open(url: string) {
  window.open(url, '_blank')
}
</script>
