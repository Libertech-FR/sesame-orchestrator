<template lang="pug">
  .column.no-wrap.full-height
    q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
      q-toolbar-title Fiche agent
      q-separator(v-for='_ in 2' :key='_' vertical)
      q-btn-group.q-ml-none(flat stretch dense)
        q-btn.q-px-sm.text-positive(
          @click='save()'
          icon='mdi-content-save'
          dense
        )
      q-separator(v-if="data.agent?._id" v-for='_ in 2' :key='_' vertical)
      q-btn-dropdown(v-if="data.agent?._id" :class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-vertical" unelevated dense)
        q-list(dense)
          q-item(v-if="data.agent?._id" clickable v-close-popup @click="deleteAgent(data.agent)")
            q-item-section(avatar)
              q-icon(name="mdi-delete" color="negative")
            q-item-section
              q-item-label Supprimer l'agent
    q-separator(v-for='_ in 2' :key='_')
    sesame-core-jsonforms-renderer(
      :manualSchema='schema'
      :manualUiSchema='uischema'
      v-model="data.agent"
      v-model:validations="validations"
    )
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'
import { NewTargetId } from '~/constants/variables'

type Agent = components['schemas']['AgentsDto']

export default defineNuxtComponent({
  name: 'SettingsAgentsIdIndexPage',
  props: {
    data: {
      type: Object as () => { agent: Agent },
      required: true,
    },
  },
  inject: ['refresh', 'deleteAgent'],
  setup() {
    const validations = ref({} as Record<string, any>)

    const { schema, uischema } = useAgentsSchema()
    const { handleErrorReq } = useErrorHandling()

    return {
      validations,
      schema,
      uischema,
      handleErrorReq,
    }
  },
  computed: {
    isNew() {
      return this.$route.params._id === NewTargetId
    },
  },
  methods: {
    async save() {
      const method = this.isNew ? 'post' : 'patch'
      const path = this.isNew ? '/core/agents' : `/core/agents/${this.data.agent!._id}`

      const sanitizedAgent: Agent & Record<string, unknown> = { ...this.data.agent }
      delete sanitizedAgent.metadata

      try {
        await this.$http[method](path, {
          body: sanitizedAgent,
        })

        this.validations = {}

        if (this.isNew) {
          this.$router.push('/settings/agents')
        }

        this.$q.notify({
          message: 'Sauvegarde effectuée',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        ;(this as any).refresh()
      } catch (error: any) {
        this.handleErrorReq({
          error: error,
          message: "Erreur lors de la sauvegarde de l'agent",
        })
        console.error("Erreur lors de la sauvegarde de l'agent:", error)

        if (error?.response?._data?.validations) {
          for (const v in error.response._data.validations) {
            this.validations[v] = error.response._data.validations[v]
          }
        }
      }
    },
  },
})
</script>
