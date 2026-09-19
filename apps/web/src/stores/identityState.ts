import { defineStore } from 'pinia'
import type { IdentityState } from '~/constants/enums'
import { MaxMenuBadgeCount } from '~/constants/variables'

export const useIdentityStateStore = defineStore('identityStates', {
  state: () => ({
    initialized: false,
    filters: {},
    counters: {},
    // Incrémenté quand les jobs de synchronisation d'identités se terminent. Les vues qui
    // affichent un état (liste du twopane, fiche identité) s'y abonnent pour se recharger :
    // l'état évolue de façon asynchrone après la sauvegarde (à synchroniser -> en cours ->
    // synchronisée) et un simple rechargement juste après le PATCH ne voit que l'état transitoire.
    revision: 0,
  }),
  getters: {
    getStateValue: (state) => (key: IdentityState | string) => state.counters[key],
  },
  actions: {
    /** Signale aux vues abonnées que les identités ont changé côté backend. */
    notifyIdentitiesChanged() {
      this.revision++
    },

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
