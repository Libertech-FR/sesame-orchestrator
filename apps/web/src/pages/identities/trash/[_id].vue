<template lang="pug">

q-card.flex.column.fit.absolute(flat)
  q-toolbar.bg-transparent.q-pa-none(style='border-radius: 0;')
    q-btn.icon(stretch icon='mdi-arrow-left' flat @click='navigateToTab(`/identities/trash`)')
      q-tooltip.text-body2(anchor="top middle" self="center middle") Retour à la liste des identités
    q-separator(v-for='_ in 2' :key='_' vertical)
    sesame-pages-identities-states-info.q-mx-sm(:identity='identity')
    q-toolbar-title.q-pa-none.cursor-pointer(@click='navigateToTab(`/identities/trash/${identity._id}`)')
      span(v-text='identity?.inetOrgPerson?.cn || "Identité sans nom"')
  q-separator(v-for='_ in 2' :key='_')
  q-card-section.col.q-pa-none.overflow-auto
    .column.no-wrap.full-height
      q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
        q-toolbar-title Fiche identité
        q-separator(v-for='_ in 2' :key='_' vertical)
        q-btn-group.q-ml-none(flat stretch dense)
          q-separator(v-if="identity?._id" v-for='_ in 2' :key='_' vertical)
            //- :disabled='!savable'
          q-btn.q-px-sm.text-positive(
            @click='save()'
            icon='mdi-content-save'
            dense
          )
      q-separator(v-for='_ in 2' :key='_')
      //- pre(v-html="JSON.stringify(identity, null, 2)")
      sesame-pages-identities-schemas-bar(
        :identity='identity'
      )
        template(#items="{ tabs }")
          q-tab-panel.q-pa-none(name="inetOrgPerson")
            sesame-core-jsonforms-renderer(
              schemaName="inetOrgPerson"
              v-model="identity.inetOrgPerson"
              v-model:validations="validations"
              :readonly='true'
              mode="update"
            )
          q-tab-panel.q-pa-none(v-for="t in tabs" :key="t" :name="t")
            sesame-core-jsonforms-renderer(
              :schema-name="t"
              v-model="identity.additionalFields.attributes[t]"
              v-model:validations="validations"
              :readonly='true'
              mode="update"
            )
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'

export default defineNuxtComponent({
  name: 'IdentitiesTrashIdPage',
  async setup() {
    const $route = useRoute()
    const { navigateToTab } = useRouteQueries()
    const identityStateStore = useIdentityStateStore()

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
      refresh,
      navigateToTab,
    }
  },
  computed: {
    validations() {
      return this.identity?.additionalFields?.validations || {}
    },
    hasValidations() {
      if (this.validations) {
        for (const field in this.validations) {
          if (Object.keys(this.validations[field]).length > 0) {
            return true
          }
        }
      }
      return false
    },
  },
  methods: {
    async save() {
      try {
        await this.$http.patch(`/management/identities/${this.identity._id}`, {
          body: this.identity,
        })

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

        if (error?.response?._data?.validations) {
          if (!this.identity?.additionalFields?.validations) {
            this.identity.additionalFields.validations = {}
          }

          for (const v in error.response._data.validations) {
            this.identity.additionalFields.validations[v] = error.response._data.validations[v]
          }
        }
      }
    },
  },
})
</script>
