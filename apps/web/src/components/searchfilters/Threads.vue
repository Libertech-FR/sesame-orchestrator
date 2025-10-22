<template lang="pug">
q-toolbar(dense).flex.justify-evenly
  q-chip(dense clickable @click="resetFilters") Tous
  q-chip(v-for="threadType in threadTypes" v-model:selected="filters[threadType.value]" @click="pushQuery({value: threadType.value, key:'filters[@type]', multiple: true})" :key="threadType.value" :label="threadType.label" dense clickable)
</template>

<script lang="ts" setup>
// import { ThreadType, threadTypes } from '~/utils'
import { useRoute, useRouter } from 'nuxt/app'
import { ref, onMounted, computed } from 'vue'
import { pushQuery } from '~/composables'

const route = useRoute()
const router = useRouter()
const filters = computed(() => {
  return {}
})

const resetFilters = async () => {
  const query = {
    ...route.query,
  }
  delete query['filters[@type]']
  delete query['filters[@type][]']
  router.push({
    query,
  })
}
</script>
