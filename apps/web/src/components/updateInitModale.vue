<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
)
  q-card.q-dialog-plugin
    q-card-section
      q-card-title.text-h6
        | Mettre à jour les identités
    q-card-section
      q-card-main

        p {{ mainText }}

        q-checkbox(
          v-model="initAllIdentities",
          :label="checkboxLabel",
        )

    q-card-actions
      q-space
      q-btn(
        color="positive",
        label="Valider",
        @click="syncIdentities"
      )
      q-btn(
        color="negative",
        label="Annuler",
        @click="cancelSync"
      )
</template>

<script lang="ts" setup>
import { ref,computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const props = defineProps({
  selectedIdentities: {
    type: Array,
    default: () => [],
  },
  identityTypesName: {
    type: String,
    required: true,
  },
  allIdentitiesCount: {
    type: Number,
    required: true,
    default: 0,
  }
})

defineEmits([...useDialogPluginComponent.emits])

const mainText = computed(() => `Vous êtes sur le point d envoyer une invitation à ${props.selectedIdentities.length} identités "${props.identityTypesName}". Voulez-vous continuer ?`)

const checkboxLabel = computed(() => {
  return `Envoyer l\'invitation à toutes les identités  (${props.allIdentitiesCount})`
})

const initAllIdentities = ref(false)

const syncIdentities = () => {
  console.log('syncIdentities')
  onDialogOK({ initAllIdentities: initAllIdentities.value })
}

const cancelSync = () => {
  console.log('cancelSync')
  onDialogCancel()
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
