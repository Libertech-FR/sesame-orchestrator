<template lang="pug">
  .column.no-wrap.full-height.relative(style='padding-top: 38px;')
    q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
      q-toolbar-title Fiche agent
      q-separator(v-for='_ in 2' :key='_' vertical)
      q-btn-group.q-ml-none(
        flat stretch dense
      )
        q-btn.q-px-sm.text-positive(
          :disable='!hasPermission("/core/agents", isNew ? "create" : "update")'
          @click='save()'
          icon='mdi-content-save'
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/core/agents', isNew ? 'create' : 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      q-separator(v-if="data.agent?._id" v-for='_ in 2' :key='_' vertical)
      q-btn-dropdown(v-if="data.agent?._id" :class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-vertical" unelevated dense)
        q-list(dense)
          q-item(
            :disable='!hasPermission("/core/agents", "update")'
            clickable
            v-close-popup
            @click="showPasswordDialog = true"
          )
            q-item-section(avatar)
              q-icon(name="mdi-key-variant" color="primary")
            q-item-section
              q-item-label Changer le mot de passe
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/core/agents', 'update')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-item(
            v-if="hasTotpEnabled"
            :disable='!hasPermission("/core/agents", "update")'
            clickable
            v-close-popup
            @click="removeTotp()"
          )
            q-item-section(avatar)
              q-icon(name="mdi-shield-off-outline" color="warning")
            q-item-section
              q-item-label Supprimer le TOTP (MFA)
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/core/agents', 'update')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-item(v-if="data.agent?._id" :disable='!hasPermission("/core/agents", "delete")' clickable v-close-popup @click="deleteAgent(data.agent)")
            q-item-section(avatar)
              q-icon(name="mdi-delete" color="negative")
            q-item-section
              q-item-label Supprimer l'agent
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/core/agents', 'delete')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
    sesame-core-jsonforms-renderer.fit(
      :key="`agent:${data.agent?._id ?? 'new'}:${isNew ? 'new' : 'edit'}`"
      :manualSchema='schema'
      :manualUiSchema='uischema'
      entityId="data.agent?._id"
      v-model="data.agent"
      v-model:validations="validations"
    )
    sesame-core-pan-informations(
      v-if="data.agent?._id"
      :data="data.agent"
    )

    q-dialog(v-model='showPasswordDialog')
      q-card(style='min-width: 420px; max-width: 95vw')
        q-card-section
          .text-h6 Changer le mot de passe
          .text-caption.text-grey-7 Mot de passe de l'agent {{ data.agent?.username }}
        q-card-section.q-pt-none.q-gutter-md
          q-input(
            v-model='passwordForm.password'
            label='Nouveau mot de passe'
            :type='showNewPassword ? "text" : "password"'
            outlined
          )
            template(#append)
              q-icon.cursor-pointer(
                :name='showNewPassword ? "mdi-eye-off" : "mdi-eye"'
                @click='showNewPassword = !showNewPassword'
              )
          q-input(
            v-model='passwordForm.confirmPassword'
            label='Confirmer le mot de passe'
            :type='showConfirmPassword ? "text" : "password"'
            outlined
          )
            template(#append)
              q-icon.cursor-pointer(
                :name='showConfirmPassword ? "mdi-eye-off" : "mdi-eye"'
                @click='showConfirmPassword = !showConfirmPassword'
              )
        q-card-actions(align='right')
          q-btn(flat color='primary' v-close-popup) Annuler
          q-btn(
            color='positive'
            icon='mdi-content-save'
            :loading='pendingPasswordSave'
            @click='savePassword'
            unelevated
          ) Mettre à jour
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
  setup(props) {
    const route = useRoute()
    const validations = ref({} as Record<string, any>)
    const { hasPermission } = useAccessControl()

    const showPasswordFields = computed(() => route.params._id === NewTargetId)
    const { schema, uischema } = useAgentsSchema(showPasswordFields)
    const { handleErrorReq } = useErrorHandling()

    const showPasswordDialog = ref(false)
    const pendingPasswordSave = ref(false)
    const passwordForm = ref({
      password: '',
      confirmPassword: '',
    })
    const showNewPassword = ref(false)
    const showConfirmPassword = ref(false)

    const initialOtpKey = ref<string>('')
    onMounted(() => {
      initialOtpKey.value = typeof props.data?.agent?.otpKey === 'string' ? props.data.agent.otpKey : ''
    })

    watch(showPasswordDialog, (open) => {
      if (open) return
      passwordForm.value.password = ''
      passwordForm.value.confirmPassword = ''
      showNewPassword.value = false
      showConfirmPassword.value = false
    })

    return {
      validations,
      schema,
      uischema,
      handleErrorReq,
      hasPermission,
      initialOtpKey,
      showPasswordDialog,
      pendingPasswordSave,
      passwordForm,
      showNewPassword,
      showConfirmPassword,
    }
  },
  computed: {
    isNew() {
      return this.$route.params._id === NewTargetId
    },
    hasTotpEnabled(): boolean {
      return typeof this.initialOtpKey === 'string' && this.initialOtpKey.length > 0
    },
  },
  methods: {
    async removeTotp() {
      if (!this.data?.agent?._id) return
      if (!this.hasPermission('/core/agents', 'update')) return

      this.data.agent.otpKey = ''
      await this.save()
    },
    async savePassword() {
      if (!this.data?.agent?._id) return
      if (!this.hasPermission('/core/agents', 'update')) return

      const password = `${this.passwordForm.password || ''}`.trim()
      const confirmPassword = `${this.passwordForm.confirmPassword || ''}`.trim()

      if (!password) {
        this.$q.notify({
          type: 'negative',
          message: 'Veuillez saisir un mot de passe',
          position: 'top-right',
        })
        return
      }

      if (password !== confirmPassword) {
        this.$q.notify({
          type: 'negative',
          message: 'La confirmation du mot de passe ne correspond pas',
          position: 'top-right',
        })
        return
      }

      this.pendingPasswordSave = true
      try {
        await this.$http.patch(`/core/agents/${this.data.agent._id}`, {
          body: { password },
        })

        this.passwordForm.password = ''
        this.passwordForm.confirmPassword = ''
        this.showPasswordDialog = false

        this.$q.notify({
          type: 'positive',
          message: 'Mot de passe mis à jour',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        ;(this as any).refresh()
      } catch (error: any) {
        this.handleErrorReq({
          error,
          message: 'Impossible de mettre à jour le mot de passe',
        })
      } finally {
        this.pendingPasswordSave = false
      }
    },
    async save() {
      const method = this.isNew ? 'post' : 'patch'
      const path = this.isNew ? '/core/agents' : `/core/agents/${this.data.agent!._id}`

      const sanitizedAgent: Agent & Record<string, unknown> = { ...this.data.agent }
      delete sanitizedAgent.metadata

      if (this.isNew) {
        const password = `${sanitizedAgent.password || ''}`.trim()
        const passwordConfirm = `${sanitizedAgent.password_confirm || ''}`.trim()

        if (!password) {
          this.$q.notify({
            type: 'negative',
            message: 'Veuillez saisir un mot de passe',
            position: 'top-right',
          })
          return
        }

        if (password !== passwordConfirm) {
          this.$q.notify({
            type: 'negative',
            message: 'La confirmation du mot de passe ne correspond pas',
            position: 'top-right',
          })
          return
        }

        sanitizedAgent.password = password
      }

      delete sanitizedAgent.password_confirm
      if (!this.isNew) {
        delete sanitizedAgent.password
      }

      const allowedNetworks = Array.isArray(sanitizedAgent.allowedNetworks) ? sanitizedAgent.allowedNetworks : undefined
      const otpKey = typeof sanitizedAgent.otpKey === 'string' ? sanitizedAgent.otpKey.trim() : undefined
      const security = typeof sanitizedAgent.security === 'object' && sanitizedAgent.security !== null ? { ...(sanitizedAgent.security as Record<string, unknown>) } : {}
      delete security.oldPasswords

      if (allowedNetworks) {
        security.allowedNetworks = allowedNetworks
      }
      // Dans "settings → agents", on autorise uniquement la suppression du TOTP :
      // - on ignore tout ajout/remplacement de clé
      // - on envoie explicitement une clé vide uniquement si l'agent en avait une au chargement
      if (typeof otpKey === 'string' && otpKey.length === 0 && this.hasTotpEnabled) {
        security.otpKey = ''
      }

      sanitizedAgent.security = security
      delete sanitizedAgent.allowedNetworks
      delete sanitizedAgent.otpKey

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
