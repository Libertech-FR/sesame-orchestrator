<template lang="pug">
div
  //q-btn(v-for="button in buttons" :key="button.icon" round flat :icon="button.icon" size="md").q-mx-sm
    q-tooltip.text-body2(transition-show="scale" transition-hide="scale") {{ button.name }}

  q-btn(v-if="badgesValues.TO_SYNC > 0" icon="mdi-sync" square color="amber-9" size="md" :label="badgesValues.TO_SYNC +' items à Synchroniser'" @click="syncAll")
  q-btn( icon="mdi-cog" size="md" flat @click="displaySettings")
  q-btn( @click="toogleDark" flat size="md" icon="mdi-theme-light-dark")
  q-btn-dropdown(icon="mdi-account-circle-outline" :label="auth?.user?.displayName" round flat size="md")
    q-list
      q-item.q-pa-none(v-for="button in buttons" :key="button.name")
        q-btn.full-width.items-baseline.q-pa-sm(
          :icon="button.icon"
          :label="button.name"
          :color="button?.color || 'primary'"
          @click="button?.action"
          :to='button?.to'
          flat
          dense
        )
  q-dialog( v-model="settings" full-width persistent)
     sesame-settings
</template>

<script lang="ts" setup>
import { useIdentityStateStore } from '~/stores/identityState'
import { ref } from 'vue'
let settings = ref(false)

const identityStateStore = useIdentityStateStore()
const stateValue = ref(0)

watch(
  () => identityStateStore.getStateValue('a_synchroniser'),
  (newValue) => (stateValue.value = newValue),
  { immediate: true },
)

const badgesValues = ref({
  TO_SYNC: computed(() => (stateValue.value > 9999 ? '9999+' : stateValue.value)),
})

const auth = useAuth()

// console.log(auth)
const buttons = [
  {
    icon: 'mdi-bug',
    name: 'Debug',
    color: 'warning',
    action: toggleDebug,
  },
  {
    icon: 'mdi-logout',
    name: 'Déconnexion',
    color: 'negative',
    action: async () => {
      await useAuth().logout()
      useRouter().go(0)
    },
  },
]

const emits = defineEmits(['syncing'])
function displaySettings() {
  settings.value = true
}
async function syncAll() {
  emits('syncing', { count: badgesValues.value.TO_SYNC })
  await useHttp('/core/backends/syncall', {
    method: 'POST',
    params: {
      async: true,
    },
  })
  await identityStateStore.fetchAllStateCount()
}

async function toggleDebug() {
  const route = useRoute()
  const router = useRouter()

  const query = { ...route.query }

  if (/true|on|yes|1/i.test(query.debug as string)) {
    delete query.debug
  } else {
    query.debug = '1'
  }

  await router.replace({
    query,
  })
}
const $q = useQuasar()

function toogleDark() {
  $q.dark.toggle()
  window.sessionStorage.setItem('darkMode', $q.dark.isActive ? 'true' : 'false')
}
</script>
