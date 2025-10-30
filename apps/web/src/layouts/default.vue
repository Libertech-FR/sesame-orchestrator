<template lang="pug">
q-layout(view="hHh LpR lff" style="margin-top: -1px;")
  sesame-appbar(@closeDrawer="drawer = !drawer" @syncing="syncing")
  q-drawer.flex(v-model="drawer" side="left" :mini="true" :breakpoint="0" bordered persistent)
    template(#mini)
      q-scroll-area.fit.mini-slot.cursor-pointer
        q-list
          q-item(@click="push('/')" clickable v-ripple)
            q-item-section(avatar)
              q-icon(name="mdi-home")
          q-separator
        q-list(v-for="part in menuParts" :key="part")
          div(v-for="menu in getMenuByPart(part)")
            q-item(v-if="menu.hideInMenuBar !== true"
              :key="part" clickable v-ripple
              :to="menu.path" :active="menu.path === $route.fullPath" active-class="q-item--active"
            )
              q-separator(v-if='menu.path === $route.fullPath' vertical color='primary' size="5px" style='position: absolute; left: 0; height: 100%; margin-top: -8px;')
              q-item-section(avatar)
                q-icon(:name="menu.icon" :color="menu.color")
              q-badge(v-if="menu.badge" :color="menu.badge.color" floating) {{ menu.badge.value }}
          q-separator
  q-page-container
    nuxt-page
    q-dialog(seamless v-model="eventSeamless" position="bottom")
      q-card(style="width: 350px")
        q-linear-progress(:value="eventSeamlessProgress" color="amber-9")
        q-card-section.row.items-center.no-wrap
          q-circular-progress.q-mr-md(indeterminate size="42px" color="amber-9")
          div
            .text-weight-bold.q-px-md.text-center
              | Synchronisation en cours&nbsp;&nbsp;
              q-badge(color="amber-10" v-show="eventSeamlessCurrent > 0") {{ eventSeamlessCurrent }}/{{ eventSeamlessTotal }}
          q-space
          q-btn(flat round icon="mdi-close" v-close-popup)
  q-footer(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" bordered)
    q-bar(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-black'")
      span
        small AppManager&nbsp;
        small(v-text="'v' + (appManagerVersion?.currentVersion || '0.0.0')")
      small.bold &nbsp;/&nbsp;
      span
        small Orchestrator&nbsp;
        small(v-text="'v' + (orchestratorVersion?.currentVersion || '0.0.0')")
      small.bold &nbsp;/&nbsp;
      span
        small Daemon&nbsp;
        small(v-text="'v' + (daemonVersion?.currentVersion || '0.0.0')")
      div.q-pr-xs
      q-btn.q-px-xs(
        v-show="appManagerVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-app-manager/releases" target="_blank"
      ) App Manager
        q-tooltip.text-body2.bg-amber-9
          | MAJ disponible (
          span(v-text="appManagerVersion?.lastVersion || '0.0.0'")
          | )
      q-btn.q-px-xs(
        v-show="orchestratorVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-orchestrator/releases" target="_blank"
      ) Orchestrator
        q-tooltip.text-body2.bg-amber-9
          | MAJ disponible (
          span(v-text="orchestratorVersion?.lastVersion || '0.0.0'")
          | )
      q-btn.q-px-xs(
        v-show="daemonVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-daemon/releases" target="_blank"
      ) Daemon
        q-tooltip.text-body2.bg-amber-9
          | MAJ disponible (
          span(v-text="daemonVersion?.lastVersion || '0.0.0'")
          | )
      q-space
      q-btn.q-px-sm(flat stretch icon="mdi-help" href="https://libertech-fr.github.io/sesame-doc/" target="_blank")
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { IdentityState } from '~/composables'
import { useIdentityStateStore } from '~/stores/identityState'
import { useMenu } from '~/composables'
import ReconnectingEventSource from 'reconnecting-eventsource'

const identityStateStore = useIdentityStateStore()

const auth = useAuth()
const config = useAppConfig()

let orchestratorVersion = ref<object | null>(null)
let appManagerVersion = ref<object | null>(null)
let daemonVersion = ref<object | null>(null)

onMounted(async () => {
  if (process.env.NODE_ENV === 'development') {
    orchestratorVersion.value = { currentVersion: '0.0.0-dev', lastVersion: '0.0.0-dev', updateAvailable: false }
    appManagerVersion.value = { currentVersion: '0.0.0-dev', lastVersion: '0.0.0-dev', updateAvailable: false }
    daemonVersion.value = { currentVersion: '0.0.0-dev', lastVersion: '0.0.0-dev', updateAvailable: false }
    return
  }

  const { data: orchestratorVersionRes } = await useHttp<any>('/get-update/sesame-orchestrator', {
    signal: AbortSignal.timeout(2000),
  })
  const { data: appManagerVersionRes } = await useHttp<any>('/get-update/sesame-app-manager', {
    signal: AbortSignal.timeout(2000),
    query: {
      current: config.appManagerVersion || '0.0.0',
    },
  })
  const { data: daemonVersionDump } = await useHttp<any>('/core/backends/execute', {
    signal: AbortSignal.timeout(2000),
    method: 'POST',
    query: {
      timeoutDiscard: true,
      disableLogs: true,
      updateStatus: false,
      syncTimeout: 1000,
    },
    body: {
      action: 'DUMP_PACKAGE_CONFIG',
    },
  })
  const { data: daemonVersionRes } = await useHttp<any>('/get-update/sesame-daemon', {
    signal: AbortSignal.timeout(2000),
    query: {
      current: daemonVersionDump?.value?.response?.data[0]?.version || '0.0.0',
    },
  })
  orchestratorVersion.value = orchestratorVersionRes.value?.data
  appManagerVersion.value = appManagerVersionRes.value?.data
  daemonVersion.value = daemonVersionRes.value?.data
})

const esUrl = new URL(window.location.origin + '/api/core/backends/sse')
esUrl.searchParams.append('id', '' + auth.user?._id)
esUrl.searchParams.append('key', '' + auth.user?.sseToken)
var es = new ReconnectingEventSource(esUrl)

// console.log('identityStateStore.getProcessingCount', identityStateStore.getProcessingCount)

const eventSeamless = ref(false)
const eventSeamlessTotal = ref(identityStateStore.getStateValue(IdentityState.PROCESSING))
const eventSeamlessCurrent = ref(0)
const eventSeamlessCurrentJobs = ref({})

const eventSeamlessProgress = computed(() => {
  return eventSeamlessTotal.value === 0 ? 0 : eventSeamlessCurrent.value / eventSeamlessTotal.value
})

async function onmessage(event) {
  try {
    const data = JSON.parse(event.data)

    if (/^job:/.test(data.channel)) {
      if (eventSeamlessTotal.value === 0) {
        await identityStateStore.fetchAllStateCount()
        eventSeamlessTotal.value = identityStateStore.getStateValue(IdentityState.PROCESSING)
      }
    }

    switch (data.channel) {
      case 'job:added':
        eventSeamless.value = true
        eventSeamlessCurrentJobs.value[data.payload.jobId] = data.payload
        break

      case 'job:failed':
      case 'job:completed':
        delete eventSeamlessCurrentJobs.value[data.payload.jobId]
        eventSeamlessCurrent.value++

        if (eventSeamlessCurrent.value >= eventSeamlessTotal.value) {
          eventSeamlessCurrent.value = 0
          eventSeamlessCurrentJobs.value = {}
          setTimeout(() => {
            eventSeamless.value = false
          }, 2000)
          await identityStateStore.fetchAllStateCount()
        }
        break
    }
  } catch (e) {
    console.error(e)
  }
}

es.onmessage = onmessage

function syncing(payload: { count: number }) {
  eventSeamlessTotal.value = payload.count
  eventSeamlessCurrent.value = 0
  eventSeamless.value = true
}

const drawer = ref(true)

const router = useRouter()
// await identityStateStore.fetchAllStateCount()

const { getMenu, menuParts, getMenuByPart, initialize } = useMenu(identityStateStore)

await initialize()

function push(path: string) {
  router.push(path)
}

function logout() {
  router.push({ name: 'login' })
}
</script>

<style>
.q-page-container {
  /* height: 100vh !important; */
  width: 100% !important;
}
</style>
