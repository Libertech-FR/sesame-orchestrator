<template lang="pug">
q-td
  q-icon(:name="stateInfo.icon" :color="stateInfo.color" :style='{color: stateInfo.color.startsWith("#") ? stateInfo.color : "inherit"}'  :class="`q-mr-md`")
    q-tooltip.text-body2(slot="trigger") Etat : {{ stateInfo.name }} ({{ stateInfo.value || '?' }})
  q-icon(:name="initStateInfo.icon" :color="initStateInfo.color" :style='{color: initStateInfo.color?.startsWith("#") ? initStateInfo.color : "inherit"}'  :class="`q-mr-md`")
    q-tooltip.text-body2(slot="trigger") Initialisation du compte : {{ initStateInfo.name }} ({{ initStateInfo.value || '?' }})
  q-icon(:name="lifecycleInfo.icon" :color="lifecycleInfo.color" :style='{color: lifecycleInfo.color?.startsWith("#") ? lifecycleInfo.color : "inherit"}' :class="`q-mr-md`")
    q-tooltip.text-body2(slot="trigger") Cycle de vie : {{ lifecycleInfo.name }} ({{ lifecycleInfo.value || '?' }})
</template>

<script lang="ts" setup>
import { inject, computed } from 'vue'
import { ref } from 'vue'
import type { components } from '#build/types/service-api'
import type { PropType } from 'vue'
import { useIdentityStates, useIdentityLifecycles, useIdentityInitStates } from '~/composables'
const { getStateColor, getStateName, getStateInfos } = useIdentityStates()
const { getInitStateColor, getInitStateName, getInitStateInfos } = useIdentityInitStates()
const { getLifecycleColor, getLifecycleName, getLifecycleInfos } = await useIdentityLifecycles()

const props = defineProps({
  identity: {
    type: Object as PropType<components['schemas']['IdentitiesDto']>,
    default: () => ({}),
  },
})

const stateInfo = computed(() => {
  const state = props.identity.state
  return getStateInfos(state)
})
const initStateInfo = computed(() => {
  const state = props.identity.initState
  return getInitStateInfos(state)
})

const lifecycleInfo = computed(() => {
  const lifecycle = props.identity.lifecycle
  return getLifecycleInfos(lifecycle)
})
</script>
