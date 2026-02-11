import { defineStore } from 'pinia'
import type { IdentityState } from '~/constants/enums'
import { MaxMenuBadgeCount } from '~/constants/variables'

export const useIdentityStateStore = defineStore('identityStates', {
  state: () => ({
    initialized: false,
    filters: {},
    counters: {},
  }),
  getters: {
    getStateValue: (state) => (key: IdentityState | string) => state.counters[key],
  },
  actions: {
    async initialize(filters = {}) {
      if (this.initialized) return

      this.filters = filters
      // console.log('Initializing identity state store with filters', filters)
      this.initialized = true
      await this.fetchAllStateCount()
    },

    async fetchAllStateCount() {
      try {
        const { data } = await $http.$post('/management/identities/count-all', {
          query: {
            limit: `${MaxMenuBadgeCount}`,
          },
          body: { ...this.filters },
        })

        for (const key in data) {
          this.counters[key] = data[key]
        }
      } catch (error) {
        console.error(error)
      }
    },
  }
})
