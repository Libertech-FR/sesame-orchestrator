<template lang="pug">
q-td
  q-btn-group(flat rounded dark)
    q-btn(:icon="isDisabledTicket ? 'mdi-eye' : 'mdi-pencil'" color="primary" @click="goToIdentity" size="sm" flat)
      q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Afficher l'identité
    q-btn(v-if="!isArchivedTicket" :icon="isDisabledTicket ? 'mdi-lock-open-variant' : 'mdi-lock'" color="primary" @click="updateLifestep(buttonAction)" size="sm" flat)
      q-tooltip.text-body2(transition-show="scale" transition-hide="scale" v-text="isDisabledTicket ? 'Ouvrir l identité' : 'Clore l identité'" )
    q-btn(v-if="isDisabledTicket" icon='mdi-archive' color='primary' @click='updateLifestep(LifeStep.ARCHIVED)' size="sm" flat)
      q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Archiver l'identité
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'nuxt/app'

const props = defineProps({
  identity: {
    type: Object,
    default: () => ({})
  }
})
const emit = defineEmits(['closeTicket', 'clear', 'updateLifestep'])

const isDisabledTicket = computed(() => {
  return false
})

const isArchivedTicket = computed(() => {
  return false
})

const buttonAction = computed(() => {
  return true
})

// const { isArchivedTicket, isDisabledTicket } = useCheckTicketState(toRefs(props.identity.lifestep))
// currentLifeStep.value = props.identity.lifestep

// function closeTicket() {
//   emit('closeTicket', props.identity)
// }

// function updateLifestep(lifestep: LifeStep) {
//   emit('updateLifestep', { identity: props.identity, lifestep })
// }

function goToIdentity() {
  useRouter().push(`/identities/${props.identity._id}`)
}
</script>
