<template lang="pug">
q-card.flex.column.fit.absolute(flat)
  q-toolbar.bg-transparent.q-pa-none(style='border-radius: 0;')
    q-btn.icon(stretch icon='mdi-arrow-left' flat @click='navigateToTab(`/identities/table`)')
      q-tooltip.text-body2(anchor="top middle" self="bottom middle") Retour à la liste des identités
    q-separator(v-for='_ in 2' :key='_' vertical)
    sesame-pages-identities-states-info.q-ml-sm(v-if='!isNew' :identity='identity')
    q-toolbar-title.q-ml-sm.q-pa-none
      span(v-if='isNew') Nouvelle identitée
      span.cursor-pointer(v-else @click='navigateToTab(`/identities/table/${identity._id}`)' v-text='identity?.inetOrgPerson?.cn || "Identité sans nom"')
      q-chip.q-ml-sm(v-if='!isNew' color='grey-8' text-color='white' size='xs')
        q-tooltip.text-body2(slot="trigger") Type d'identitée
        b(v-text='identity?.inetOrgPerson?.employeeType')
    q-tabs.full-height(:model-value='tab' v-if='!isSmall && !isNew')
      template(v-for="tab in tabs" :key="tab.name")
        q-separator.q-mx-xs(v-if="tab.type === 'separator'" inset vertical)
        q-tab.q-px-none(
          v-else-if="tab.type !== 'separator'"
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
import { extractValidations, formatApiErrorMessage } from '~/composables/useErrorHandling'
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
      // `refreshAll` et non `refresh` : toute mutation faite depuis le volet de droite
      // (etat, cycle de vie, mot de passe, invitation...) change aussi des colonnes de la
      // liste du twopane, qui doit donc etre rechargee en meme temps que la fiche.
      refresh: this.refreshAll,
    }
  },
  async setup() {
    const $route = useRoute()
    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const identityStateStore = useIdentityStateStore()
    const originTarget = ref({} as any)

    if (NewTargetId === $route.params._id) {
      return {
        identityStateStore,
        // `ref` obligatoire : un objet litteral renvoye par `setup` n'est pas reactif,
        // les erreurs de validation posees sur `additionalFields.validations` ne seraient pas affichees.
        identity: ref({
          state: IdentityState.TO_CREATE,
          inetOrgPerson: {
            mail: '',
            employeeType: 'LOCAL',
          },
          additionalFields: {
            attributes: {},
            objectClasses: [] as string[],
            validations: {},
          },
        } as Identity),
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
      identityStateStore,
      identity,
      originTarget,
      refresh,
      toPathWithQueries,
      navigateToTab,
    }
  },
  computed: {
    identitiesRevision(): number {
      return this.identityStateStore.revision
    },
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
  watch: {
    // Même raison que dans la liste : l'état définitif n'est connu qu'à la fin des jobs
    // de synchronisation déclenchés par la sauvegarde.
    identitiesRevision() {
      if (!this.isNew) this.refresh()
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

        if (this.identity?.additionalFields?.validations) {
          this.identity.additionalFields.validations = {}
        }

        if (this.isNew) {
          this.$router.push('/identities/table')
        }

        this.$q.notify({
          message: 'Sauvegarde effectuée',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })

        await this.refreshAll()
      } catch (error: any) {
        this.$q.notify({
          message: formatApiErrorMessage(error, "Erreur lors de la sauvegarde de l'identité"),
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
          multiLine: true,
          timeout: 10000,
        })
        console.error('Erreur lors de la sauvegarde de l identité:', error)

        const validations = extractValidations(error)
        if (validations) {
          if (!this.identity.additionalFields) {
            this.identity.additionalFields = {
              attributes: {},
              objectClasses: [],
              validations: {},
            }
          }

          this.identity.additionalFields.validations = { ...validations }
        }
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

      await this.refreshAll()
    },
    /** Recharge la fiche courante puis la liste du twopane (volet de gauche). */
    async refreshAll() {
      await this.refresh()
      this.$emit('refresh')
    },
  },
})
</script>
