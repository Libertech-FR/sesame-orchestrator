<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>

<script lang="ts" setup>
const $q = useQuasar()
const $route = useRoute()

if (/1|yes|on|true/.test($route.query.embedded as string)) {
  setPageLayout('empty')
}

const darkMode = window.sessionStorage.getItem('darkMode')
if (typeof darkMode === 'string') {
  $q.dark.set(/true|1|on/.test(darkMode))
} else {
  window.sessionStorage.setItem('darkMode', $q.dark.isActive ? 'true' : 'false')
}
</script>
