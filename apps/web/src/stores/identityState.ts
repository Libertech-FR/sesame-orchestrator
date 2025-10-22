import { defineStore } from 'pinia';
import { IdentityState } from '@/composables/useIdentityStates';

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
      if (this.initialized) return;

      this.filters = filters;
      this.initialized = true;
      await this.fetchAllStateCount();
    },
    async fetchAllStateCount() {
      try {
        const { data } = await $http.$post('/management/identities/count-all?limit=99999999', {
          body: { ...this.filters },
        });

        for (const key in data) {
          this.counters[key] = data[key];
        }
      } catch (error) {
        console.error(error);
      }
    },
  }
});
