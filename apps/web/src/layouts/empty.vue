<template lang="pug">
q-layout(view="hHh LpR lff" style="margin-top: -1px;")
  q-page-container
    slot
</template>

<script lang="ts">
import { loadingBarDefaults } from '~/composables/useLoadingBarHijackFilter'

export default defineNuxtComponent({
  name: 'EmptyLayout',
  setup() {
    const $q = useQuasar()

    $q.loadingBar.setDefaults(loadingBarDefaults)

    return { }
  },
})
</script>
