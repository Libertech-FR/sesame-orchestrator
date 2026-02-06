<template lang="pug">
q-layout(view="hHh LpR lff" style="margin-top: -1px;")
  sesame-layouts-default-appbar
  sesame-layouts-default-drawer
  q-page-container.full-height
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
    }
  },
  data() {
    return {
      es: null as ReconnectingEventSource | null,
      drawer: true,
      menuParts: [],

      eventSeamless: false,
      eventSeamlessCurrent: 0,
      eventSeamlessCurrentJobs: {},
    }
  },
  async setup() {
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

    const esUrl = new URL(window.location.origin + '/api/core/backends/sse')
    esUrl.searchParams.append('id', '' + auth.user?._id)
    esUrl.searchParams.append('key', '' + auth.user?.sseToken)

    this.es = new ReconnectingEventSource(esUrl)
    this.es.onmessage = this.onmessage.bind(this)
  },
  destroyed() {
    if (this.es) {
      this.es.close()
    }
  },
})
</script>
