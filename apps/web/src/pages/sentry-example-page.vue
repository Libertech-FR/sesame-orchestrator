<template>
  <button id="errorBtn" @click="triggerError">Trigger Error</button>
</template>

<script setup>
const triggerError = () => {
  throw new Error('Nuxt Button Error')
}
</script>
