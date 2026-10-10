<template lang="pug">
q-dialog(:model-value='modelValue' @update:model-value='$emit("update:modelValue", $event)' @hide='onHide')
  q-card.column.no-wrap(style='width: 900px; max-width: 95vw; height: 85vh')
    q-toolbar.bg-primary.text-white
      q-icon(name='mdi-account' size='sm')
      q-toolbar-title
        span(v-if='identity' v-text='identity.inetOrgPerson?.cn || "Identité sans nom"')
        span(v-else) Identité
        q-chip.q-ml-sm(v-if='identity?.inetOrgPerson?.employeeType' color='grey-8' text-color='white' size='xs')
          b(v-text='identity.inetOrgPerson.employeeType')
      q-btn(v-if='identityId' icon='mdi-open-in-new' flat dense round @click='openFull')
        q-tooltip.text-body2 Ouvrir la fiche complète
      q-btn(icon='mdi-close' flat dense round v-close-popup)
    q-separator
    template(v-if='loading')
      .col.flex.flex-center
        q-spinner(size='3em' color='primary')
    template(v-else-if='identity')
      .q-pa-sm
        sesame-pages-identities-states-info(:identity='identity')
      q-separator
      q-tabs(v-model='tab' align='left' dense no-caps inline-label active-color='primary' indicator-color='primary')
        q-tab.q-px-md(name='inetOrgPerson' label='inetOrgPerson')
        q-tab.q-px-md(v-for='name in objectClasses' :key='name' :name='name' :label='name')
      q-separator
      q-tab-panels.col(v-model='tab' animated)
        q-tab-panel.q-pa-none(name='inetOrgPerson')
          sesame-core-jsonforms-renderer.full-width(
            schemaName='inetOrgPerson'
            :entityId='identity._id'
            :schema-body-params='schemaBodyParams'
            :model-value='identity.inetOrgPerson'
            mode='update'
            readonly
          )
        q-tab-panel.q-pa-none(v-for='name in objectClasses' :key='name' :name='name')
          sesame-core-jsonforms-renderer.full-width(
            :schema-name='name'
            :entityId='identity._id'
            :schema-body-params='schemaBodyParams'
            :model-value='identity.additionalFields?.attributes?.[name] || {}'
            mode='update'
            readonly
          )
    template(v-else)
      .col.flex.flex-center.text-grey Identité introuvable
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'

type Identity = components['schemas']['IdentitiesDto']

export default defineNuxtComponent({
  name: 'SesamePagesGroupsMemberIdentityDialogComponent',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    identityId: {
      type: String as () => string | null,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const { navigateToTab } = useRouteQueries()

    return { navigateToTab }
  },
  data() {
    return {
      identity: null as Identity | null,
      loading: false,
      tab: 'inetOrgPerson',
    }
  },
  computed: {
    objectClasses(): string[] {
      return this.identity?.additionalFields?.objectClasses || []
    },
    schemaBodyParams() {
      return {
        employeeType: this.identity?.inetOrgPerson?.employeeType,
      }
    },
  },
  watch: {
    modelValue(open: boolean) {
      if (open) this.load()
    },
  },
  methods: {
    async load() {
      if (!this.identityId) return
      this.loading = true
      this.tab = 'inetOrgPerson'
      try {
        const res = await this.$http.get(`/management/identities/${this.identityId}`)
        this.identity = res?._data?.data || null
      } catch (error) {
        console.error(error)
        this.identity = null
      } finally {
        this.loading = false
      }
    },
    onHide() {
      this.identity = null
    },
    async openFull() {
      this.$emit('update:modelValue', false)
      await this.navigateToTab(`/identities/table/${this.identityId}`)
    },
  },
})
</script>
