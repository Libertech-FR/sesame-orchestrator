<template lang="pug">
  .column.no-wrap.full-height.relative
    .sesame-sticky-space
    q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
      q-btn.sesame.infinite.animated.flash(size="sm" padding="xs" color="negative" @click="validationsModal = true" v-if="!isNew && hasValidations" outline)
        q-tooltip.text-body2(slot="trigger") Afficher les erreurs
        q-icon.text-negative(name='mdi-alert-box')
      q-dialog(v-model="validationsModal")
        q-card(style="min-width: 350px")
          q-card-section.q-pa-sm.bg-negative.text-white.flex
            q-icon(name='mdi-alert-box' size="2rem")
            div.text-h6.q-ml-md Erreurs de validation
          q-card-section.q-py-sm
            q-list(separator)
              q-item(v-for="field in Object.keys(validations)" :key="field")
                q-item-section.text-negative
                  q-item-label {{ field }}
                  q-item-label(v-for='f in validations[field]' caption) - {{ f }}
          q-card-actions(align="right")
            q-btn(flat label="Fermer" color="primary" v-close-popup)
      q-toolbar-title.gt-xs Fiche identité
      q-separator(v-for='_ in 2' :key='_' vertical)
      q-toggle.q-pr-md.q-pl-xs(
        v-if="identity?._id"
        :class="[loadingSwitchStatus ? 'mdi-spinner-parent' : '']"
        :checked-icon="loadingSwitchStatus ? 'mdi-loading' : 'mdi-account-check'"
        :unchecked-icon="loadingSwitchStatus ? 'mdi-loading' : 'mdi-account-cancel'"
        indeterminate-icon="mdi-lock-reset"
        :keep-color="!loadingSwitchStatus"
        size="sm"
        @click="switchAccountStatus"
        :color="getStatusColor"
        :label="getStatusLabel"
        :disable="loadingSwitchStatus || !hasPermission('/management/identities', 'update')"
        :model-value="identity.dataStatus"
        :true-value="1"
        :indeterminate-value="-2"
        :false-value="-3"
      )
        q-tooltip.text-body2.bg-negative.text-white(
          v-if="!hasPermission('/management/identities', 'update')"
          anchor="top middle"
          self="center middle"
        ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
        q-tooltip.text-body2(slot="trigger" v-else) Activer/Désactiver l'identité
      q-separator(v-if="identity?._id" v-for='_ in 2' :key='_' vertical)
      q-btn-group.q-ml-none(flat stretch dense)
        q-btn.q-px-sm(
          v-if="identity?._id"
          @click="forceChangePassword()"
          :color="identity.state != IdentityState.SYNCED ? 'grey-7' : 'orange-8'"
          :disabled="identity.state != IdentityState.SYNCED || !hasPermission('/management/identities', 'update')"
          icon="mdi-lock-reset"
          flat dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/identities', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-tooltip.text-body2(slot="trigger" v-else) Obliger l'utilisateur à changer son mot de passe
        q-btn.q-px-sm(
          v-if="identity?._id"
          @click="resetPasswordModal = true"
          :color="identity.state != IdentityState.SYNCED ? 'grey-7' : 'red-8'"
          :disabled="identity.state != IdentityState.SYNCED || !hasPermission('/management/identities', 'update')"
          icon="mdi-account-key"
          flat dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/identities', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-tooltip.text-body2(slot="trigger" v-else) Définir le mot de passe
        q-btn.q-px-sm(
          v-if="identity?._id"
          @click="sendInit()"
          :color="identity.state != IdentityState.SYNCED ? 'grey-7' : 'primary'"
          :disabled="identity.state != IdentityState.SYNCED || !hasPermission('/management/identities', 'update')"
          icon="mdi-email-arrow-right"
          flat dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/identities', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-tooltip.text-body2(slot="trigger" v-else) Envoyer le mail d'invitation
        q-separator(v-if="identity?._id" v-for='_ in 2' :key='_' vertical)
        q-btn.q-px-sm.text-positive(
          :disable="!hasPermission('/management/identities', 'update')"
          @click='save()'
          icon='mdi-content-save'
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/identities', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-tooltip.text-body2.bg-positive(slot='trigger' v-else) Enregistrer les modifications
        q-btn.q-px-sm.text-orange-8(
          :disable="!hasPermission('/management/identities', 'update')"
          @click='sync()'
          v-if="identity?._id"
          :disabled="(identity?.state != IdentityState.TO_VALIDATE && identity?.state != IdentityState.TO_CREATE) || !hasPermission('/management/identities', 'update')"
          icon='mdi-sync'
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/identities', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-tooltip.text-body2(slot="trigger" v-else :class='identity?.state == IdentityState.TO_VALIDATE ? "bg-orange-8" : ""')
            span(v-if="identity.state == IdentityState.TO_VALIDATE || identity.state == IdentityState.TO_CREATE") Synchroniser l'identité
            span(v-else) L'état de l'identité ne permet pas de la synchroniser
        q-separator(v-if="identity?._id" v-for='_ in 2' :key='_' vertical)
        q-btn-dropdown.q-pl-sm.full-height.text-purple-8(
          v-if="identity?._id"
          :disable="!hasPermission('/management/lifecycle', 'update')"
          icon='mdi-clock' square unelevated dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/lifecycle', 'update')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
          q-list(dense)
            q-item(
              v-for='stateItem in stateList' :key='stateItem.key'
              @click="switchLifecycle(stateItem.key)"
              :active='stateItem.key === identity.lifecycle'
              active-class="bg-purple-8 text-white"
              clickable v-close-popup
            )
              q-item-section(avatar)
                q-icon(:name="stateItem.icon || 'mdi-help-rhombus-outline'" :color="stateItem.color")
              q-item-section
                q-item-label
                  span(v-text='stateItem.label')
                  | &nbsp;
                  small(v-text='("(" + stateItem.key + ")")')
        q-separator(v-for='_ in 2' :key='_' vertical)
        q-btn-dropdown(:class="[$q.dark.isActive ? 'text-white' : 'text-black']" dropdown-icon="mdi-dots-vertical" unelevated dense)
          q-list(dense)
            q-item(v-if="identity?._id" clickable v-close-popup @click="deleteIdentity(identity)" :disable="!hasPermission('/management/identities', 'delete')")
              q-tooltip.text-body2.bg-negative.text-white(
                v-if="!hasPermission('/management/identities', 'delete')"
                anchor="top middle"
                self="center middle"
              ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
              q-item-section(avatar)
                q-icon(name="mdi-delete" color="negative")
              q-item-section
                q-item-label Supprimer l'identité
    //- pre(v-html="JSON.stringify(identity, null, 2)")
    sesame-pages-identities-schemas-bar(
      :identity='identity'
      :readonly="identity.state === IdentityState.TO_SYNC"
      top-offset='38px'
    )
      template(#items="{ tabs }")
        q-tab-panel.q-pa-none.column.no-wrap.full-height(name="inetOrgPerson")
          .col.overflow-auto(style="min-height: 0")
            sesame-core-jsonforms-renderer.full-width(
              :key="`inetOrgPerson:${schemaBodyParams.employeeType ?? ''}`"
              schemaName="inetOrgPerson"
              :entityId="identity._id"
              :schema-body-params="schemaBodyParams"
              v-model="identity.inetOrgPerson"
              v-model:validations="validations"
              :readonly="identity.state === IdentityState.TO_SYNC || !hasPermission('/management/identities', 'update')"
              :mode="isNew ? 'create' : 'update'"
            )
          sesame-pages-identities-pan-informations(
            v-if="identity?._id"
            :data="identity"
          )
        q-tab-panel.q-pa-none.column.no-wrap.full-height(v-for="t in tabs" :key="t" :name="t")
          .col.overflow-auto(style="min-height: 0")
            sesame-core-jsonforms-renderer.full-width(
              :key="`${t}:${schemaBodyParams.employeeType ?? ''}`"
              :schema-name="t"
              :entityId="identity._id"
              :schema-body-params="schemaBodyParams"
              v-model="identity.additionalFields.attributes[t]"
              v-model:validations="validations"
              :readonly="identity.state === IdentityState.TO_SYNC || !hasPermission('/management/identities', 'update')"
              :mode="isNew ? 'create' : 'update'"
            )
          sesame-pages-identities-pan-informations(
            v-if="identity?._id"
            :data="identity"
          )
  q-dialog(v-model="resetPasswordModal" persistent medium)
    q-card(style="width: 800px")
      q-toolbar.bg-primary(flat)
        q-toolbar-title Définir un nouveau mot de passe
        q-btn(icon="mdi-close" flat dense @click="resetPasswordModal = false")
      q-card-section
        sesame-core-input-new-password(v-model="newpassword")
      q-separator(v-for='_ in 2' :key='_')
      q-card-actions(align="right")
        q-btn(label="Abandonner" color="negative" @click="resetPasswordModal = false")
        q-btn(label="Sauver" color="positive" @click="doChangePassword" :disabled="newpassword === ''")
</template>

<script lang="ts">
import { IdentityState, DataStatus } from '~/constants/enums'
import { NewTargetId } from '~/constants/variables'

export default defineNuxtComponent({
  name: 'IdentitiesTableIdIndexPage',
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  inject: ['save', 'sync', 'refresh', 'deleteIdentity'],
  data() {
    return {
      IdentityState,
      newpassword: '',
      validationsModal: false,
      resetPasswordModal: false,
      loadingSwitchStatus: false,
    }
  },
  async setup() {
    const { stateList } = await useIdentityLifecycles()
    const { hasPermission } = useAccessControl()

    return {
      stateList,
      hasPermission,
    }
  },
  computed: {
    isNew(): boolean {
      return this.$route.params._id === NewTargetId
    },
    validations() {
      return this.identity?.additionalFields?.validations || {}
    },
    schemaBodyParams() {
      return {
        employeeType: this.identity?.inetOrgPerson?.employeeType,
      }
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
    getStatusColor() {
      if (this.identity.dataStatus === 1) {
        return 'green'
      } else if (this.identity.dataStatus === -3) {
        return 'negative'
      } else {
        return 'grey'
      }
    },
    getStatusLabel() {
      if (this.identity.dataStatus === 1) {
        return 'Activé'
      } else if (this.identity.dataStatus === -3) {
        return 'Désactivé'
      } else {
        return 'Non initialisé'
      }
    },
  },
  methods: {
    async switchLifecycle(lifecycle: string) {
      const requestOptions = { method: 'POST', body: JSON.stringify({ lifecycle }) }
      try {
        const data = await this.$http.patch(`/management/identities/${this.identity._id}/lifecycle`, requestOptions)
        this.$q.notify({
          message: 'Le cycle de vie a été mis à jour : ' + data._data?.data?.lifecycle,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        this.refresh()
      } catch (error: any) {
        this.$q.notify({
          message: 'Impossible de modifier le cycle de vie : ' + error.response._data.message,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      }
    },
    async doChangePassword() {
      try {
        const data = await this.$http.post('/management/identities/forcepassword', {
          method: 'POST',
          body: JSON.stringify({ id: this.identity._id, newPassword: this.newpassword }),
        })

        this.$q.notify({
          message: `Le mot de passe de <${this.identity.inetOrgPerson.uid}> a été changé !`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        this.refresh()
      } catch (error: any) {
        this.$q.notify({
          message: 'Impossible de modifier le mot de passe : ' + error.response._data.message,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      }
      this.resetPasswordModal = false
    },
    async forceChangePassword() {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez vous forcer le changement de mot de passe ? ',
          persistent: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Forcer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          try {
            await this.$http.post('/management/identities/needtochangepassword', {
              body: JSON.stringify({ id: this.identity._id }),
            })
            this.$q.notify({
              message: 'Le changement de mot de passe est forcé : ',
              color: 'positive',
              position: 'top-right',
              icon: 'mdi-check-circle-outline',
            })
            this.refresh()
          } catch (error: any) {
            this.$q.notify({
              message: 'Impossible de forcer le changement de mot de passe : ' + error.response._data.message,
              color: 'negative',
              position: 'top-right',
              icon: 'mdi-alert-circle-outline',
            })
          }
        })
    },
    async sendInit() {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: `Voulez vous envoyer le mail d'invitation <${this.identity.inetOrgPerson.uid}> ?`,
          persistent: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Envoyer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          try {
            await this.$http.post('/management/passwd/init', {
              method: 'POST',
              body: JSON.stringify({ uid: this.identity.inetOrgPerson.uid }),
            })
            this.$q.notify({
              message: 'Le mail a été envoyé',
              color: 'positive',
              position: 'top-right',
              icon: 'mdi-check-circle-outline',
            })
            this.refresh()
          } catch (e: any) {
            this.$q.notify({
              message: "Erreur lors de l'envoi du mail : " + e.response._data.message,
              color: 'negative',
              position: 'top-right',
              icon: 'mdi-alert-circle-outline',
            })
          }
        })
    },
    async switchAccountStatus() {
      const { confirmButton } = useModalButtons()
      if (!this.hasPermission('/management/identities', 'update')) {
        return
      }

      let bouton = ''
      let message = ''
      let status = DataStatus.NOTINITIALIZED

      if (this.loadingSwitchStatus) {
        return
      }

      if (this.identity.dataStatus >= DataStatus.NOTINITIALIZED) {
        status = DataStatus.INACTIVE
        bouton = 'Désactiver'
        message = "Voulez vous vraiment désactiver l'identité"
      } else {
        status = DataStatus.ACTIVE
        bouton = 'Activer'
        message = "Voulez vous vraiment activer l'identité"
      }

      if (!this.identity.lastBackendSync) {
        this.$q.dialog({
          title: 'Information',
          message: "L'identité n'a jamais été synchronisée. Impossible de changer le statut.",
          persistent: true,
          ok: confirmButton.value,
        })
        return
      }

      this.$q
        .dialog({
          title: 'Confirmation',
          message: message,
          persistent: true,
          ok: {
            push: true,
            color: 'positive',
            label: bouton,
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          this.loadingSwitchStatus = true
          try {
            const data = await this.$http.post('/management/identities/activation', {
              method: 'POST',
              body: JSON.stringify({
                id: this.identity._id,
                status,
              }),
            })
            this.refresh()

            this.$q.notify({
              message: 'Le statut a été mis à jour : ' + data._data.message,
              color: 'positive',
              position: 'top-right',
              icon: 'mdi-check-circle-outline',
            })
          } catch (error: any) {
            const fails: any[] = []
            for (const field in error.response._data.validations) {
              fails.push(error.response._data.validations[field])
            }
            this.$q.notify({
              message: `${error.response._data.message}.<br> ${fails.join(', ')}`,
              html: true,
              color: 'negative',
              position: 'top-right',
              icon: 'mdi-alert-circle-outline',
            })
          } finally {
            this.loadingSwitchStatus = false
          }
        })
    },
  },
})
</script>
