<template lang="pug">
q-layout(view="lHh Lpr fff")
  q-page-container
    q-page.window-height.window-width.row.justify-center.items-center(
      :style-fn="getStyle"
    )
      slot
      q-fab.absolute(
        style="bottom: 16px; right: 16px;"
        color="primary"
        icon="mdi-help-circle"
        direction='left'
      )
        q-btn-group(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'")
          sesame-core-help-buttons(size='sm')
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'SimpleCenteredLayout',
  setup() {
    const $q = useQuasar()

    $q.loadingBar.setDefaults({
      color: 'white',
      size: '3px',
      position: 'top'
    })

    const getStyle = () => {
      return {
        backgroundImage: `url('/config/login-background.png'), linear-gradient(#5274C5, #9A4A9F)`,
        backgroundSize: 'cover',
      }
    }

    return { getStyle }
  },
})
</script>
