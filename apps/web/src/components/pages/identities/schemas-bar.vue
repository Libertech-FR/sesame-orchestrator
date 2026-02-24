<template lang="pug">
div
  q-bar.q-px-none.sesame-sticky-bar(:style="{ top: '36px' }")
    q-tabs(
      v-model="tab"
      align="left"
      narrow-indicator
      outside-arrows
      inline-label
      stretch
      no-caps
      shrink
      dense
    )
      q-tab.q-px-md(name="inetOrgPerson" label="inetOrgPerson" :alert="getTabValidations('inetOrgPerson')" alert-icon="mdi-alert-box")
      q-separator(vertical)
      template(v-for="name in tabs" :key="name")
        q-tab.q-px-md(
          :name="name"
          :label="name"
          :alert="getTabValidations(name)"
          alert-icon="mdi-alert-box"
        )
        q-btn.q-px-xs(
          v-if="!readonly"
          @click.native.stop="removeSchema(name)"
          icon='mdi-delete-outline'
          color='negative'
          size="sm"
          stretch
          dense
          flat
        )
        q-separator(vertical)
    q-space
    q-separator(v-for='_ in 2' :key='_' vertical)
    q-btn-dropdown.q-pl-sm.full-height#schema-add(
      :disabled="pending || schemas.length === 0 || readonly"
      icon="mdi-newspaper-plus"
      flat dense
    )
      q-list
        q-item(
          v-for="schema in schemas"
          @click="addSchema(schema)"
          v-close-popup
          clickable
          dense
        )
          q-item-section
            q-item-label(v-text="schema.name")
    q-tooltip.text-body2(
      anchor="top middle"
      self="center middle"
      target='#schema-add'
    )
      span(v-if="pending") Chargement des schémas...
      span(v-else-if="schemas.length === 0") Tous les schémas sont déjà ajoutés
      span(v-else-if="!readonly") Ajouter un schéma
      span(v-else) Impossible d'ajouter un schéma en mode lecture seule
  q-tab-panels(v-model="tab" keep-alive)
    slot(name='items' :tabs="tabs")
      q-tab-panel.q-pa-none(v-for="key in ['inetOrgPerson', ...tabs]" :key="key" :name="key")
        div.q-pa-md Unknown schema "{{ key }}"
</template>

<script lang="ts">
import { useHashState } from '~/jsonforms'

export default defineNuxtComponent({
  name: 'SesamePagesIdentitiesSchemasBarComponent',
  props: {
    identity: {
      type: Object,
      required: true,
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  async setup({ identity }) {
    const { state, set } = useHashState()
    const tabs = ref<string[]>(identity?.additionalFields?.objectClasses || [])
    const isHydrated = ref(false)

    // Wait for the hash state to be fully hydrated before using it
    onMounted(() => {
      isHydrated.value = true
    })

    const tab = computed({
      get: () => {
        return state.value['schema'] || 'inetOrgPerson'
      },
      set: (val: string) => {
        // Only update the hash if the state is hydrated to avoid writing the default value
        if (isHydrated.value) {
          set({ ['schema']: val })
        }
      },
    })

    watch(
      () => identity._id,
      () => {
        if (!identity.additionalFields?.objectClasses.includes(tab.value)) {
          tab.value = 'inetOrgPerson'
        }
      },
      { immediate: true },
    )

    const {
      data: schemasResult,
      pending,
      refresh,
    } = await useHttp<any>(`/management/identities/validation`, {
      method: 'GET',
    })

    const schemas = computed(() => {
      return schemasResult.value.data.filter((schema: any) => {
        return !tabs.value.includes(schema.name) && `${schema.name}`.toLocaleLowerCase() !== 'inetOrgPerson'.toLocaleLowerCase()
      })
    })

    return {
      tab,
      tabs,
      schemas,
      pending,
      refresh,
    }
  },
  computed: {
    validations() {
      return this.identity?.additionalFields?.validations ?? {}
    },
  },
  methods: {
    getTabValidations(tab: string) {
      return this.validations?.hasOwnProperty(tab) ? 'red' : false
    },
    addSchema(schema) {
      if (!this.identity.additionalFields) {
        this.identity.additionalFields = {
          objectClasses: [],
          attributes: {},
        }
      }

      if (!this.identity.additionalFields.objectClasses) {
        this.identity.additionalFields.objectClasses = []
      }

      if (!this.identity.additionalFields.attributes) {
        this.identity.additionalFields.attributes = {}
      }

      this.identity.additionalFields.attributes[schema.name] = {}
      this.identity.additionalFields.objectClasses.push(schema.name)
      this.tab = schema.name
    },
    removeSchema(name: string): void {
      this.$q
        .dialog({
          title: 'Suppression',
          message: `Voulez-vous supprimer le schéma <code>"${name}"</code> ? <br/><small>Cela supprimera également toutes les données associées à ce schéma.</small>`,
          persistent: true,
          html: true,
          ok: { push: true, color: 'negative', label: 'Supprimer' },
          cancel: { push: true, color: 'primary', label: 'Annuler' },
        })
        .onOk(() => {
          this.tab = 'inetOrgPerson'
          this.tabs.splice(this.tabs.indexOf(name), 1)

          if (this.identity?.additionalFields?.attributes[name]) {
            delete this.identity.additionalFields.attributes[name]
          }
        })
    },
  },
})
</script>
