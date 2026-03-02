<template lang="pug">
  .column.no-wrap.full-height.relative(style='padding-top: 38px;')
    q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
      q-toolbar-title Fiche de rôle
      q-separator(v-for='_ in 2' :key='_' vertical)
      q-btn-group.q-ml-none(
        flat stretch dense
      )
        q-btn.q-px-sm.text-positive(
          :disable='!hasPermission("/core/roles", isNew ? "create" : "update")'
          @click='save()'
          icon='mdi-content-save'
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/core/roles', isNew ? 'create' : 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      q-separator(v-if="data.role?._id" v-for='_ in 2' :key='_' vertical)
      q-btn-dropdown(v-if="data.role?._id" :class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-vertical" unelevated dense)
        q-list(dense)
          q-item(v-if="data.role?._id" :disable='!hasPermission("/core/roles", "delete")' clickable v-close-popup @click="deleteRole(data.role)")
            q-item-section(avatar)
              q-icon(name="mdi-delete" color="negative")
            q-item-section
              q-item-label Supprimer le rôle
            q-tooltip.text-body2.bg-negative.text-white(
              v-if="!hasPermission('/core/roles', 'delete')"
              anchor="top middle"
              self="center middle"
            ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
    sesame-core-jsonforms-renderer(
      :manualSchema='schema'
      :manualUiSchema='uischema'
      v-model="data.role"
      v-model:validations="validations"
    )
</template>

<script lang="ts">
import type { components } from '#build/types/service-api'
import { NewTargetId } from '~/constants/variables'

type Role = components['schemas']['RolesDto']

export default defineNuxtComponent({
  name: 'SettingsRolesIdIndexPage',
  props: {
    data: {
      type: Object as () => { role: Role },
      required: true,
    },
  },
  inject: ['refresh', 'deleteRole'],
  setup() {
    const validations = ref({} as Record<string, any>)
    const { hasPermission } = useAccessControl()
    const { schema, uischema } = useRolesSchema()
    const { handleErrorReq } = useErrorHandling()

    return {
      validations,
      schema,
      uischema,
      handleErrorReq,
      hasPermission,
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
      const path = this.isNew ? '/core/roles' : `/core/roles/${this.data.role!._id}`

      const sanitizedRole: Role & Record<string, unknown> = { ...this.data.role }
      delete sanitizedRole.metadata

      try {
        await this.$http[method](path, {
          body: sanitizedRole,
        })

        this.validations = {}

        if (this.isNew) {
          this.$router.push('/settings/roles')
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
          message: "Erreur lors de la sauvegarde du rôle",
        })
        console.error("Erreur lors de la sauvegarde du rôle:", error)

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
