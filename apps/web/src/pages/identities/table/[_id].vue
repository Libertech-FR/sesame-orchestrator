<template lang="pug">
q-card.flex.column.fit.absolute(flat)
  q-toolbar.bg-transparent.q-pa-none(style='border-radius: 0;')
    q-btn.icon(stretch icon='mdi-arrow-left' flat @click='navigateToTab(`/identities/table`)')
      q-tooltip.text-body2(anchor="top middle" self="center middle") Retour à la liste des identités
    q-separator(v-for='_ in 2' :key='_' vertical)
    sesame-pages-identities-states-info.q-mx-sm(:identity='identity')
    q-toolbar-title.q-pa-none.cursor-pointer(@click='navigateToTab(`/identities/table/${identity._id}`)')
      span(v-if='isNew') Nouvelle identitée
      span(v-else v-text='identity?.inetOrgPerson?.cn || "Identité sans nom"')
    q-tabs.full-height(:model-value='tab' v-if='!isSmall && !isNew')
      q-tab.q-px-none(
        v-for="tab in tabs" :key="tab.name"
        @click='tab?.action(identity)'
        v-show='typeof tab?.condition === "function" ? tab.condition() : true'
        :class="[tab.textColor ? `text-${tab.textColor}` : 'text-primary']"
        :name="tab.name"
        :icon="tab.icon"
      )
        q-popup-proxy(context-menu :offset="[0, 10]")
          q-list(dense bordered separator)
            q-item(@click='tab?.action()' clickable)
              q-item-section(avatar)
                q-icon(name="mdi-open-in-new" :class="tab.textColor ? `text-${tab.textColor}` : 'text-primary'")
              q-item-section
                q-item-label Ouvrir dans un nouvel onglet
        q-tooltip.text-body2(
          :delay="200"
          v-text="tab.label" :class="tab.bgColor ? `bg-${tab.bgColor}` : 'bg-primary'"
        )
  q-separator(v-for='_ in 2' :key='_')
  q-card-section.col.q-pa-none.overflow-auto
    nuxt-page(:identity='identity' ref='page')
</template>

<script lang="ts">
import { clone } from 'radash'
import { IdentityState } from '~/constants/enums'
import { useIdentityStateStore } from '~/stores/identityState'
import { NewTargetId } from '~/constants/variables'
import type { components } from '#build/types/service-api'

type Identity = components['schemas']['IdentitiesDto']

export default defineNuxtComponent({
  name: 'IdentitiesIdPage',
  data() {
    return {
      IdentityState,
    }
  },
  inject: ['tabs'],
  provide() {
    return {
      // savable: this.savable,
      save: this.save,
      sync: this.sync,
      refresh: this.refresh,
    }
  },
  async setup() {
    const $route = useRoute()
    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const identityStateStore = useIdentityStateStore()
    const originTarget = ref({} as any)

    if (NewTargetId === $route.params._id) {
      return {
        identity: {
          state: IdentityState.TO_CREATE,
          inetOrgPerson: {
            mail: '',
          },
          additionalFields: {
            attributes: {},
            objectClasses: [] as string[],
          },
        } as Identity,
        originTarget,
        refresh: () => Promise.resolve(),
        toPathWithQueries,
        navigateToTab,
      }
    }

    const {
      data: identity,
      error,
      refresh,
    } = await useHttp<any>(`/management/identities/` + $route.params._id, {
      method: 'get',
      transform: (result) => {
        return result?.data
      },
      onResponse: (ctx) => {
        originTarget.value = clone(ctx.response._data?.data || {})
        identityStateStore.fetchAllStateCount()
      },
    })
    if (error.value) {
      console.error(error.value)
      throw showError({
        statusCode: 404,
        statusMessage: 'Page Not Found',
      })
    }

    return {
      identity,
      originTarget,
      refresh,
      toPathWithQueries,
      navigateToTab,
    }
  },
  computed: {
    isNew(): boolean {
      return this.$route.params._id === NewTargetId
    },
    isSmall(): boolean {
      return this.$q.screen.lt.md
    },
    tab: {
      get(): string {
        return this.$route.path.split('/')[4] || 'index'
      },
      set(value: string) {
        this.navigateToTab(`/identities/table/${this.identity._id}/${value === 'index' ? '' : value}`)
      },
    },
  },
  methods: {
    async save() {
      const sanitizedIdentity = { ...this.identity }
      delete sanitizedIdentity.metadata
      if (sanitizedIdentity?.additionalFields?.validations) delete sanitizedIdentity.additionalFields.validations

      const method = this.isNew ? 'post' : 'patch'
      const path = this.isNew ? '/management/identities' : `/management/identities/${this.identity._id}`

      try {
        await this.$http[method](path, {
          body: sanitizedIdentity,
        })

        if (this.isNew) {
          this.$router.push('/identities/table')
        }

        this.$q.notify({
          message: 'Sauvegarde effectuée',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })

        this.refresh()
        this.$emit('refresh')
      } catch (error: any) {
        this.$q.notify({
          message: "Erreur lors de la sauvegarde de l'identité",
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
        console.error('Erreur lors de la sauvegarde de l identité:', error)
      }
    },
    async sync() {
      const res = await this.$http.patch(`/management/identities/${this.identity._id}/state`, {
        body: { state: IdentityState.TO_SYNC },
      })

      if (res) {
        this.$q.notify({
          message: 'Mise en état, à synchroniser',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
      }

      this.refresh()
      this.$emit('refresh')
    },
  },
})
</script>
