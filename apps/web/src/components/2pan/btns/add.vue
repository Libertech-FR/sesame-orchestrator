<template lang="pug">
q-btn(flat icon="mdi-plus" @click="add" size="md" color="primary" dense)
    q-tooltip.text-body2(transition-show="scale" transition-hide="scale") {{ tooltip }}
</template>

<script lang="ts" setup>
import type { PropType } from 'vue'
const props = defineProps({
  tooltip: {
    type: String,
    default: () => 'Ajouter',
  },
})

const emit = defineEmits(['add'])
function add() {
  emit('add')
}
</script>
