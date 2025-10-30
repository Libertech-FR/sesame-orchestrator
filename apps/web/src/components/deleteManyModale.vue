<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
)
  q-card.q-dialog-plugin
    q-card-section
      q-card-title.text-h6
        | Suppression en masse des identités
    q-card-section
      q-card-main

        p {{ mainText }}

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
import { ref, computed } from 'vue'
import { useDialogPluginComponent } from 'quasar'

const props = defineProps({
  selectedIdentities: {
    type: Array,
    default: () => [],
  },
})

defineEmits([...useDialogPluginComponent.emits])

const mainText = computed(() => `Vous êtes sur le point de supprimer ${props.selectedIdentities.length} identités. Voulez-vous continuer ?`)

const syncIdentities = () => {
  console.log('syncIdentities')
  onDialogOK({ success: true })
}

const cancelSync = () => {
  console.log('cancelSync')
  onDialogCancel()
}

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
