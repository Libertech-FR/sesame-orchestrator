<template lang="pug">
.grid.q-gutter-sm
  q-icon(
    :name="stateInfo(identity.state).icon"
    :color="stateInfo(identity.state).color"
    :style='{color: stateInfo(identity.state).color?.startsWith("#") ? stateInfo(identity.state).color : "inherit"}'
  )
    q-tooltip.text-body2(slot="trigger") Etat : {{ stateInfo(identity.state).name }} ({{ stateInfo(identity.state).value || '?' }})
  q-icon(
    :name="initStateInfo(identity.initState).icon"
    :color="initStateInfo(identity.initState).color"
    :style='{color: initStateInfo(identity.initState).color?.startsWith("#") ? initStateInfo(identity.initState).color : "inherit"}'
  )
    q-tooltip.text-body2(slot="trigger") Initialisation du compte : {{ initStateInfo(identity.initState).name }} ({{ initStateInfo(identity.initState).value || '?' }})
  q-icon(
    :name="lifecycleInfo(identity.lifecycle).icon"
    :color="lifecycleInfo(identity.lifecycle).color"
    :style='{color: lifecycleInfo(identity.lifecycle).color?.startsWith("#") ? lifecycleInfo(identity.lifecycle).color : "inherit"}'
  )
    q-tooltip.text-body2(slot="trigger") Cycle de vie : {{ lifecycleInfo(identity.lifecycle).name }} ({{ lifecycleInfo(identity.lifecycle).value || '?' }})

</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'PagesIdentitiesStatesInfoComponent',
  props: {
    identity: {
      type: Object as PropType<Record<string, any>>,
      required: true,
    },
  },
  async setup() {
    const { getStateInfos } = useIdentityStates()
    const { getInitStateInfos } = useIdentityInitStates()
    const { getLifecycleInfos } = await useIdentityLifecycles()

    return {
      getStateInfos,
      getInitStateInfos,
      getLifecycleInfos,
    }
  },
  methods: {
    stateInfo(state: number) {
      return this.getStateInfos(state)
    },
    initStateInfo(state: number) {
      return this.getInitStateInfos(state)
    },
    lifecycleInfo(lifecycle: string) {
      return this.getLifecycleInfos(lifecycle)
    },
  },
})
</script>
