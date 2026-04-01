<template lang="pug">
q-layout(view="hHh LpR lff" style="margin-top: -1px;")
  sesame-layouts-default-appbar
  sesame-layouts-default-drawer
  q-page-container.full-height
    slot
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
  sesame-layouts-default-footer
</template>

<script lang="ts">
import { IdentityState } from '~/constants/enums'
import { useIdentityStateStore } from '~/stores/identityState'
import ReconnectingEventSource from 'reconnecting-eventsource'

export default defineNuxtComponent({
  name: 'DefaultLayout',
  provide() {
    return {
      syncing: this.syncing,
      orchestratorVersion: this.orchestratorVersion,
      daemonVersion: this.daemonVersion,
    }
  },
  data() {
    return {
      es: null as ReconnectingEventSource | null,
      removeRouteBeforeEachGuard: null as (() => void) | null,
      removeRouteAfterEachHook: null as (() => void) | null,
      removeRouteErrorHook: null as (() => void) | null,
      drawer: true,
      menuParts: [],

      eventSeamless: false,
      eventSeamlessCurrent: 0,
      eventSeamlessCurrentJobs: {},
      orchestratorVersion: {
        currentVersion: null,
        lastVersion: null,
        updateAvailable: false,
      },
      daemonVersion: {
        currentVersion: null,
        lastVersion: null,
        updateAvailable: false,
      },
    }
  },
  async setup() {
    const $q = useQuasar()

    $q.loadingBar.setDefaults({
      color: 'white',
      size: '3px',
      position: 'top'
    })

    const identityStateStore = useIdentityStateStore()
    const { menuParts, getMenuByPart, initialize } = useMenu(identityStateStore)

    await initialize()

    return {
      menuParts,
      getMenuByPart,
      identityStateStore,
      eventSeamlessTotal: identityStateStore.getStateValue(IdentityState.PROCESSING),
    }
  },
  computed: {
    eventSeamlessProgress(): number {
      if (this.eventSeamlessTotal === 0) return 0
      return this.eventSeamlessCurrent / this.eventSeamlessTotal
    },
  },
  methods: {
    async fetchVersions(): Promise<void> {
      try {
        const orchestratorResponse = await $http.$get('/get-update/sesame-orchestrator') as {
          data?: {
            currentVersion?: string
            lastVersion?: string
            updateAvailable?: boolean
          }
        }
        const orchestratorData = orchestratorResponse?.data
        Object.assign(this.orchestratorVersion, {
          currentVersion: orchestratorData?.currentVersion || '0.0.0',
          lastVersion: orchestratorData?.lastVersion || '0.0.0',
          updateAvailable: Boolean(orchestratorData?.updateAvailable),
        })
      } catch (error) {
        console.error(error)
      }

      try {
        const daemonPackageResponse = await $http.$post('/core/backends/execute', {
          query: {
            async: 'false',
            disableLogs: 'true',
            timeoutDiscard: 'true',
            syncTimeout: '3000',
          },
          method: 'POST',
          body: {
            action: 'DUMP_PACKAGE_CONFIG',
          },
        }) as {
          response?: {
            data?: Array<{
              version?: string
            }> | {
              package?: {
                version?: string
              }
              version?: string
            }
            package?: {
              version?: string
            }
            version?: string
          }
        }

        const daemonResponseData = daemonPackageResponse?.response?.data
        const daemonResponseDataVersion = Array.isArray(daemonResponseData)
          ? daemonResponseData?.[0]?.version
          : daemonResponseData?.package?.version || daemonResponseData?.version

        const daemonCurrentVersion =
          daemonResponseDataVersion ||
          daemonPackageResponse?.response?.package?.version ||
          daemonPackageResponse?.response?.version ||
          '0.0.0'

        const daemonUpdateResponse = await $http.$get(`/get-update/sesame-daemon?current=${encodeURIComponent(daemonCurrentVersion)}`) as {
          data?: {
            currentVersion?: string
            lastVersion?: string
            updateAvailable?: boolean
          }
        }
        const daemonUpdateData = daemonUpdateResponse?.data
        Object.assign(this.daemonVersion, {
          currentVersion: daemonUpdateData?.currentVersion || daemonCurrentVersion,
          lastVersion: daemonUpdateData?.lastVersion || '0.0.0',
          updateAvailable: Boolean(daemonUpdateData?.updateAvailable),
        })
      } catch (error) {
        console.error(error)
      }
    },
    syncing(payload: { count: number }) {
      this.eventSeamlessTotal = payload.count
      this.eventSeamlessCurrent = 0
      this.eventSeamless = true
    },
    async onmessage(event) {
      try {
        const data = JSON.parse(event.data)

        if (/^job:/.test(data.channel)) {
          if (this.eventSeamlessTotal === 0) {
            await this.identityStateStore.fetchAllStateCount()
            this.eventSeamlessTotal = this.identityStateStore.getStateValue(IdentityState.PROCESSING)
          }
        }

        switch (data.channel) {
          case 'job:added':
            this.eventSeamless = true
            this.eventSeamlessCurrentJobs[data.payload.jobId] = data.payload
            break

          case 'job:failed':
          case 'job:completed':
            delete this.eventSeamlessCurrentJobs[data.payload.jobId]
            this.eventSeamlessCurrent++

            if (this.eventSeamlessCurrent >= this.eventSeamlessTotal) {
              this.eventSeamlessCurrent = 0
              this.eventSeamlessCurrentJobs = {}
              setTimeout(() => {
                this.eventSeamless = false
              }, 2000)
              await this.identityStateStore.fetchAllStateCount()
            }
            break
        }
      } catch (e) {
        console.error(e)
      }
    },
  },
  mounted() {
    const auth = useAuth()

    this.removeRouteBeforeEachGuard = this.$router.beforeEach((_to, _from, next) => {
      this.$q.loadingBar.start()
      next()
    })
    this.removeRouteAfterEachHook = this.$router.afterEach(() => {
      this.$q.loadingBar.stop()
    })
    this.removeRouteErrorHook = this.$router.onError(() => {
      this.$q.loadingBar.stop()
    })

    const esUrl = new URL(window.location.origin + '/api/core/backends/sse')
    esUrl.searchParams.append('id', '' + auth.user?._id)
    esUrl.searchParams.append('key', '' + auth.user?.sseToken)

    this.es = new ReconnectingEventSource(esUrl)
    this.es.onmessage = this.onmessage.bind(this)

    this.fetchVersions()
  },
  destroyed() {
    this.removeRouteBeforeEachGuard?.()
    this.removeRouteAfterEachHook?.()
    this.removeRouteErrorHook?.()
    this.$q.loadingBar.stop()

    if (this.es) {
      this.es.close()
    }
  },
})
</script>
