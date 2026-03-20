<template lang="pug">
q-layout(view="hHh LpR lff" style="margin-top: -1px;")
  q-page-container
    slot
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'EmptyLayout',
  setup() {
    const $q = useQuasar()

    $q.loadingBar.setDefaults({
      color: 'white',
      size: '3px',
      position: 'top'
    })

    return { }
  },
})
</script>
