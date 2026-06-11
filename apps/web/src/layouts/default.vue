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
  sesame-core-app-debug-panels
</template>

<script lang="ts">
import { IdentityState } from '~/constants/enums'
import { useIdentityStateStore } from '~/stores/identityState'
import { loadingBarDefaults } from '~/composables/useLoadingBarHijackFilter'
import { attachSocketIoDebug } from '~/composables/useSocketIoDebug'
import { buildSocketIoClientOptions } from '~/composables/useSocketIoClient'
import { io, type Socket } from 'socket.io-client'

export default defineNuxtComponent({
  name: 'DefaultLayout',
  provide() {
    return {
      syncing: this.syncing,
      orchestratorVersion: this.orchestratorVersion,
      daemonVersion: this.daemonVersion,
      daemonStatus: this.daemonStatus,
    }
  },
  data() {
    return {
      socket: null as Socket | null,
      stopAuthWatch: null as (() => void) | null,
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
      daemonStatus: {
        online: false,
        pingMs: null as number | null,
        checking: true,
      },
      lastDaemonVersionChecked: null as string | null,
    }
  },
  async setup() {
    const $q = useQuasar()

    $q.loadingBar.setDefaults(loadingBarDefaults)

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

    },
    async fetchDaemonUpdateInfo(version: string): Promise<void> {
      try {
        const daemonCurrentVersion = version || '0.0.0'
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
    applyDaemonStatus(payload: { online?: boolean; pingMs?: number | null; version?: string }): void {
      Object.assign(this.daemonStatus, {
        online: Boolean(payload?.online),
        pingMs: payload?.pingMs ?? null,
        checking: false,
      })

      if (payload?.online && payload?.version && this.lastDaemonVersionChecked !== payload.version) {
        this.lastDaemonVersionChecked = payload.version
        void this.fetchDaemonUpdateInfo(payload.version)
      }
    },
    syncing(payload: { count: number }) {
      this.eventSeamlessTotal = payload.count
      this.eventSeamlessCurrent = 0
      this.eventSeamless = true
    },
    connectBackendsSocket(auth: ReturnType<typeof useAuth>): void {
      const connect = () => {
        const id = auth.user?._id
        const key = auth.user?.sseToken
        if (!id || !key) {
          return
        }

        this.disconnectBackendsSocket()

        this.socket = io('/core/backends', buildSocketIoClientOptions({ id, key }))
        attachSocketIoDebug(this.socket, '/core/backends')
        this.socket.on('connect', () => {
          Object.assign(this.daemonStatus, { checking: true })
          this.socket?.emit('daemon:status')
        })
        this.socket.on('disconnect', () => {
          Object.assign(this.daemonStatus, { online: false, pingMs: null, checking: true })
        })
        this.socket.on('message', this.onSocketMessage.bind(this))
        this.socket.on('connect_error', () => {
          Object.assign(this.daemonStatus, { online: false, pingMs: null, checking: true })
          if (!auth.user?.sseToken) {
            this.disconnectBackendsSocket()
          }
        })
      }

      if (auth.user?._id && auth.user?.sseToken) {
        connect()
        return
      }

      this.stopAuthWatch = watch(
        () => [auth.user?._id, auth.user?.sseToken],
        () => {
          if (auth.user?._id && auth.user?.sseToken) {
            this.stopAuthWatch?.()
            this.stopAuthWatch = null
            connect()
          }
        },
      )
    },
    disconnectBackendsSocket(): void {
      if (this.socket) {
        this.socket.removeAllListeners()
        this.socket.disconnect()
        this.socket = null
      }
    },
    async onSocketMessage(data: { channel: string; payload: { jobId?: string; online?: boolean; pingMs?: number | null; version?: string } }) {
      try {
        if (data.channel === 'daemon:status') {
          this.applyDaemonStatus(data.payload)
          return
        }

        if (/^job:/.test(data.channel)) {
          if (this.eventSeamlessTotal === 0) {
            await this.identityStateStore.fetchAllStateCount()
            this.eventSeamlessTotal = this.identityStateStore.getStateValue(IdentityState.PROCESSING)
          }
        }

        switch (data.channel) {
          case 'job:added':
            this.eventSeamless = true
            if (data.payload?.jobId) {
              this.eventSeamlessCurrentJobs[data.payload.jobId] = data.payload
            }
            break

          case 'job:failed':
          case 'job:completed':
            if (data.payload?.jobId) {
              delete this.eventSeamlessCurrentJobs[data.payload.jobId]
            }
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

    this.connectBackendsSocket(auth)

    this.fetchVersions()
  },
  destroyed() {
    this.removeRouteBeforeEachGuard?.()
    this.removeRouteAfterEachHook?.()
    this.removeRouteErrorHook?.()
    this.$q.loadingBar.stop()

    this.stopAuthWatch?.()
    this.stopAuthWatch = null
    this.disconnectBackendsSocket()
  },
})
</script>
