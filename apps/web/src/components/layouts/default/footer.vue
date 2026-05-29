<template lang="pug">
  q-footer(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white'" bordered)
    q-bar(:class="$q.dark.isActive ? 'bg-dark' : 'bg-white text-black'")
      q-btn.q-px-xs(
        v-if="debug"
        flat
        stretch
        dense
        round
        icon="mdi-bug-outline"
        color="orange"
        @click="openDebugNetwork"
      )
        q-tooltip.text-body2(anchor="top middle" self="bottom middle") Debug Application
      q-separator.q-mx-sm(v-if="debug" vertical inset style="width: 2px;")
      a(
        :href="orchestratorVersion?.currentVersion ? 'https://github.com/Libertech-FR/sesame-orchestrator/releases/tag/' + orchestratorVersion?.currentVersion : 'javascript:void(0)'"
        :target="orchestratorVersion?.currentVersion ? '_blank' : undefined"
        rel="noopener noreferrer"
        style="color: inherit; text-decoration: none;"
      )
        q-tooltip.text-body2(
          v-if="orchestratorVersion?.currentVersion"
          anchor="top middle"
          self="bottom middle"
        )
          | Version d’Orchestrator actuellement installée : {{ orchestratorVersion?.currentVersion ? ('v' + orchestratorVersion?.currentVersion) : 'N/A' }}.
          br
          small.text-caption Cliquez pour ouvrir la page de version et consulter les notes de publication.
        small.gt-xs Orchestrator&nbsp;
        small.text-grey-7(v-text="orchestratorVersion?.currentVersion ? ('v' + orchestratorVersion?.currentVersion) : 'N/A'")
      q-separator.q-mx-sm(vertical inset style="width: 2px;")
      .row.items-center.no-wrap(style="margin: 0 !important;")
        a(
          :href="daemonVersion?.currentVersion ? 'https://github.com/Libertech-FR/sesame-daemon/releases/tag/' + daemonVersion?.currentVersion : 'javascript:void(0)'"
          :target="daemonVersion?.currentVersion ? '_blank' : undefined"
          rel="noopener noreferrer"
          style="color: inherit; text-decoration: none;"
        )
          q-tooltip.text-body2(
            v-if="daemonVersion?.currentVersion"
            anchor="top middle"
            self="bottom middle"
          )
            | Version de Daemon actuellement installée : {{ daemonVersion?.currentVersion ? ('v' + daemonVersion?.currentVersion) : 'N/A' }}.
            br
            small.text-caption Cliquez pour ouvrir la page de version et consulter les notes de publication.
          small.gt-xs Daemon&nbsp;
          small.text-grey-7(v-text="daemonVersion?.currentVersion ? ('v' + daemonVersion?.currentVersion) : 'N/A'")
        q-icon.q-mr-xs.cursor-help.q-ml-xs(
          :name="daemonStatusIcon"
          :color="daemonStatusColor"
          size="16px"
        )
          q-tooltip.text-body2(anchor="top middle" self="bottom middle") {{ daemonStatusTooltip }}
      q-separator.q-mx-sm(v-if='orchestratorVersion?.updateAvailable || daemonVersion?.updateAvailable' vertical inset style="width: 2px;")
      q-btn.q-px-xs(
        v-show="orchestratorVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-orchestrator/releases" target="_blank"
      ) Orchestrator
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="orchestratorVersion?.lastVersion")
          | )
      q-btn.q-px-xs(
        v-show="daemonVersion?.updateAvailable"
        flat stretch icon="mdi-alert-box" color="amber-9"
        href="https://github.com/Libertech-FR/sesame-daemon/releases" target="_blank"
      ) Daemon
        q-tooltip.text-body2.bg-amber-9
          | MÀJ. disponible (
          span(v-text="daemonVersion?.lastVersion")
          | )
      q-space
      sesame-core-help-buttons
  q-dialog(v-model="debugDialog" @show="onDebugDialogShow")
    q-card(style="min-width: 340px; max-width: min(560px, 92vw)")
      q-toolbar.bg-orange-8.text-white(dense)
        q-toolbar-title.text-subtitle2 Debug Application
        q-btn(icon="mdi-close" flat round dense v-close-popup)
      q-separator
      q-card-section.q-pa-md
        q-linear-progress(v-if="debugNetworkLoading" indeterminate color="orange" class="q-mb-md")
        pre.text-body2.q-ma-none(v-else style="white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, monospace;") {{ debugNetworkFormatted }}
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'LayoutsDefaultFooterComponent',
  inject: ['orchestratorVersion', 'daemonVersion'],
  setup() {
    const orchestratorVersion = inject('orchestratorVersion')
    const daemonVersion = inject('daemonVersion')
    const { debug } = useDebug()

    const debugDialog = ref(false)
    const debugNetworkLoading = ref(false)
    const debugNetworkPayload = ref<Record<string, unknown> | null>(null)

    const loadDebugNetwork = async () => {
      debugNetworkLoading.value = true
      debugNetworkPayload.value = null
      try {
        const { $http } = useNuxtApp()
        debugNetworkPayload.value = (await $http.$get('/core/auth/debug/client-diagnostic')) as Record<string, unknown>
      } catch (err: unknown) {
        debugNetworkPayload.value = {
          error: err instanceof Error ? err.message : String(err),
        }
      } finally {
        debugNetworkLoading.value = false
      }
    }

    const openDebugNetwork = () => {
      debugDialog.value = true
    }

    const onDebugDialogShow = () => {
      void loadDebugNetwork()
    }

    const debugNetworkFormatted = computed(() =>
      debugNetworkPayload.value ? JSON.stringify(debugNetworkPayload.value, null, 2) : '',
    )

    const daemonStatus = ref({
      online: false,
      pingMs: null as number | null,
      checking: true,
    })
    let daemonStatusTimer: ReturnType<typeof setInterval> | null = null

    const fetchDaemonStatus = async () => {
      daemonStatus.value.checking = true
      try {
        const { $http } = useNuxtApp()
        const response = (await $http.$get('/core/backends/daemon/status')) as {
          online?: boolean
          pingMs?: number | null
          data?: { online?: boolean; pingMs?: number | null }
        }
        const payload = response?.data ?? response
        daemonStatus.value = {
          online: Boolean(payload?.online),
          pingMs: payload?.pingMs ?? null,
          checking: false,
        }
      } catch {
        daemonStatus.value = { online: false, pingMs: null, checking: false }
      }
    }

    const daemonStatusIcon = computed(() => {
      if (daemonStatus.value.checking) return 'mdi-circle-outline'
      return daemonStatus.value.online ? 'mdi-circle' : 'mdi-circle'
    })

    const daemonStatusColor = computed(() => {
      if (daemonStatus.value.checking) return 'grey-6'
      return daemonStatus.value.online ? 'positive' : 'negative'
    })

    const daemonStatusTooltip = computed(() => {
      if (daemonStatus.value.checking) return 'Vérification du daemon…'
      if (daemonStatus.value.online && daemonStatus.value.pingMs !== null) {
        return `Ping : ${daemonStatus.value.pingMs} ms`
      }
      return 'Daemon indisponible'
    })

    onMounted(() => {
      void fetchDaemonStatus()
      daemonStatusTimer = setInterval(() => void fetchDaemonStatus(), 20_000)
    })

    onUnmounted(() => {
      if (daemonStatusTimer) clearInterval(daemonStatusTimer)
    })

    return {
      orchestratorVersion,
      daemonVersion,
      daemonStatus,
      daemonStatusIcon,
      daemonStatusColor,
      daemonStatusTooltip,
      debug,
      debugDialog,
      debugNetworkLoading,
      debugNetworkPayload,
      openDebugNetwork,
      onDebugDialogShow,
      debugNetworkFormatted,
    }
  },
})
</script>
