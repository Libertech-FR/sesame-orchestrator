<template lang="pug">
  template(v-if="debug")
    q-btn(
      flat
      round
      dense
      icon="mdi-bug-outline"
      :color="color"
      :size="size"
      @click="openDebugNetwork"
    )
      q-tooltip.text-body2(anchor="top middle" self="bottom middle") Debug Application
    q-btn(
      flat
      round
      dense
      icon="mdi-lan-connect"
      color="orange-8"
      :size="size"
      @click="openDebugSocket"
    )
      q-tooltip.text-body2(anchor="top middle" self="bottom middle") Debug Socket.IO
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'CoreAppDebugButtonsComponent',
  props: {
    size: {
      type: String,
      default: undefined,
    },
    color: {
      type: String,
      default: 'orange',
    },
  },
  setup() {
    const { debug } = useDebug()
    const { openDebugNetwork, openDebugSocket } = useAppDebugPanels()

    return {
      debug,
      openDebugNetwork,
      openDebugSocket,
    }
  },
})
</script>
