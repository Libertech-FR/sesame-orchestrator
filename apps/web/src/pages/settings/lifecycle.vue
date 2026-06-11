<template lang="pug">
.sesame-page
  .sesame-page-content.lifecycle-settings-content.column.no-wrap
    q-tabs(v-model='activeTab' dense align='left' active-color='primary' indicator-color='primary' shrink)
      q-tab(name='rules' icon='mdi-file-tree' label='Fichiers de règles')
      q-tab(name='states' icon='mdi-state-machine' label='États personnalisés')
    q-separator
    q-tab-panels.lifecycle-settings-panels.col(v-model='activeTab' animated)
      q-tab-panel.q-pa-none.fit(name='rules')
        .lifecycle-rules-panel
          sesame-core-twopan.col.fit(
            table-title='Fichiers de règles lifecycle'
            :simple='true'
            :loading='rulesPending'
            :rows='rulesRows'
            :total='rulesTotal'
            :columns='rulesColumns'
            :visible-columns='rulesVisibleColumns'
            :refresh='refreshRules'
            :targetId='targetId'
            row-key='name'
          )
            template(#before-top-right-before)
              q-btn(
                :disable='!hasPermission("/management/lifecycle", "create")'
                icon='mdi-plus'
                flat
                dense
                @click='openCreateRuleDialog'
              )
                q-tooltip.text-body2 Créer un fichier de règles
              q-separator.q-mx-sm(vertical)
            template(#top-table)
              sesame-core-pan-filters(:columns='rulesColumns' mode='simple' placeholder='Rechercher par nom, source, cible...')
            template(v-slot:row-actions='{ row }')
              q-btn(
                :disable='!hasPermission("/management/lifecycle", "read")'
                color='primary'
                icon='mdi-eye'
                size='12px'
                flat round dense
                @click='openEditRuleDialog(row)'
              )
                q-tooltip.text-body2 Consulter / modifier
              q-btn(
                :disable='!hasPermission("/management/lifecycle", "update")'
                :loading='!!ruleExecuteLoading[row.name]'
                color='purple'
                icon='mdi-play-circle-outline'
                size='12px'
                flat round dense
                @click='executeRule(row)'
              )
                q-tooltip.text-body2 Exécuter les règles cron (trigger: -1)
              q-btn(
                :disable='!hasPermission("/management/lifecycle", "delete")'
                color='negative'
                icon='mdi-delete'
                size='12px'
                flat round dense
                @click='deleteRule(row)'
              )
                q-tooltip.text-body2 Supprimer
            template(#body-cell-cronExecutable='props')
              q-td
                q-icon(
                  :name='props.row.cronExecutable ? "mdi-check-circle" : "mdi-close-circle"'
                  :color='props.row.cronExecutable ? "positive" : "grey"'
                  size='18px'
                )
      q-tab-panel.q-pa-none.fit.scroll(name='states')
        .q-pa-md
          .text-subtitle2.q-mb-sm États par défaut (non modifiables)
          q-markup-table(dense flat bordered)
            thead
              tr
                th.text-left Clé
                th.text-left Label
                th.text-left Description
            tbody
              tr(v-for='state in defaultStates' :key='state.key')
                td
                  q-badge(:style='{ backgroundColor: state.color }') {{ state.key }}
                td {{ state.label }}
                td.text-caption {{ state.description }}
          .row.items-center.q-mt-lg.q-mb-sm
            .text-subtitle2 États personnalisés (states.yml)
            q-space
            q-btn(
              :disable='!hasPermission("/management/lifecycle", "create")'
              color='primary'
              icon='mdi-plus'
              label='Ajouter un état'
              dense
              flat
              @click='openCreateStateDialog'
            )
          q-markup-table(dense flat bordered v-if='customStates.length')
            thead
              tr
                th.text-left Clé
                th.text-left Label
                th.text-left Description
                th.text-left Icône
                th.text-left Couleur
                th.text-right Actions
            tbody
              tr(v-for='(state, index) in customStates' :key='state.key')
                td
                  q-badge(:style='{ backgroundColor: state.color || "#888" }') {{ state.key }}
                td {{ state.label }}
                td.text-caption {{ state.description }}
                td
                  q-icon(v-if='state.icon' :name='state.icon' size='18px')
                td
                  span.text-monospace {{ state.color }}
                td.text-right
                  q-btn(
                    :disable='!hasPermission("/management/lifecycle", "update")'
                    icon='mdi-pencil'
                    size='sm'
                    flat round dense
                    @click='openEditStateDialog(index)'
                  )
                  q-btn(
                    :disable='!hasPermission("/management/lifecycle", "delete")'
                    icon='mdi-delete'
                    color='negative'
                    size='sm'
                    flat round dense
                    @click='deleteState(index)'
                  )
          .text-grey-7.q-mt-md(v-else) Aucun état personnalisé configuré.
          .row.q-mt-md(v-if='statesDirty')
            q-btn(
              :disable='!hasPermission("/management/lifecycle", "update")'
              :loading='statesSaving'
              color='positive'
              push
              icon='mdi-content-save'
              label='Enregistrer les états'
              @click='saveStates'
            )
  q-dialog(v-model='ruleDialog' persistent maximized)
    q-card.fit.column.no-wrap
      q-toolbar.bg-primary.text-white(dense)
        q-toolbar-title {{ ruleDialogTitle }}
        q-btn(flat round dense icon='mdi-close' v-close-popup)
      q-card-section.col.scroll
        .column.q-gutter-md
          q-input(
            v-if='isCreateRuleMode'
            :disable='!hasPermission("/management/lifecycle", "create")'
            outlined dense
            v-model='ruleForm.name'
            label='Nom du fichier (sans extension)'
            hint='Exemple : 01-etd → configs/lifecycle/rules/01-etd.yml'
            :error='!!ruleValidations.name'
            :error-message='ruleValidations.name'
          )
          q-input(
            v-else
            outlined dense readonly
            :model-value='ruleForm.name'
            label='Nom du fichier'
          )
          q-banner.rounded-borders(dense :class='{ "bg-grey-2 text-grey-9": !$q.dark.isActive, "bg-grey-8 text-white": $q.dark.isActive }')
            template(#avatar)
              q-icon(name='mdi-information-outline' color='primary')
            | Définissez les règles de transition au format JSON. Chaque règle peut inclure : sources, target, trigger, dateKey, rules, mutation.
            | Utilisez trigger: -1 pour une exécution via cron/CLI, ou une durée (ex. "90d", "5s").
          q-input(
            :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
            outlined
            type='textarea'
            autogrow
            v-model='ruleForm.identitiesJson'
            label='Règles (identities)'
            input-style='font-family: ui-monospace, monospace; min-height: 320px;'
            :error='!!ruleValidations.identities'
            :error-message='ruleValidations.identities'
          )
      q-card-actions(align='right')
        q-btn(flat label='Annuler' v-close-popup)
        q-btn(
          :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
          :loading='ruleSaving'
          color='positive'
          push
          :label='isCreateRuleMode ? "Créer" : "Enregistrer"'
          icon='mdi-content-save'
          @click='saveRuleForm'
        )
  q-dialog(v-model='stateDialog' persistent)
    q-card(style='min-width: 480px; max-width: 90vw;')
      q-toolbar.bg-primary.text-white(dense)
        q-toolbar-title {{ isCreateStateMode ? 'Ajouter un état' : 'Modifier un état' }}
        q-btn(flat round dense icon='mdi-close' v-close-popup)
      q-card-section
        .column.q-gutter-md
          q-input(
            :disable='!isCreateStateMode || !hasPermission("/management/lifecycle", "create")'
            outlined dense
            :readonly='!isCreateStateMode'
            v-model='stateForm.key'
            label='Clé (1 caractère)'
            maxlength='1'
            :error='!!stateValidations.key'
            :error-message='stateValidations.key'
          )
          q-input(
            outlined dense
            v-model='stateForm.label'
            label='Label'
            :error='!!stateValidations.label'
            :error-message='stateValidations.label'
          )
          q-input(
            outlined dense autogrow
            v-model='stateForm.description'
            label='Description'
            :error='!!stateValidations.description'
            :error-message='stateValidations.description'
          )
          q-input(
            outlined dense
            v-model='stateForm.icon'
            label='Icône (mdi-*)'
            hint='Exemple : mdi-account-clock'
          )
          q-input(
            outlined dense
            v-model='stateForm.color'
            label='Couleur (hex)'
            hint='Exemple : #f0ad4e'
          )
      q-card-actions(align='right')
        q-btn(flat label='Annuler' v-close-popup)
        q-btn(
          color='positive'
          push
          :label='isCreateStateMode ? "Ajouter" : "Appliquer"'
          icon='mdi-check'
          @click='applyStateForm'
        )
</template>

<script lang="ts">
import { reactive, ref } from 'vue'

type LifecycleRuleSummary = {
  name: string
  rulesCount: number
  cronExecutable: boolean
  sources: string[]
  targets: string[]
}

type LifecycleState = {
  key: string
  label: string
  description: string
  icon?: string
  color?: string
}

const RULE_TEMPLATE = `[
  {
    "sources": ["I"],
    "rules": { "inetOrgPerson.departmentNumber": "etd" },
    "trigger": -1,
    "dateKey": "metadata.lastUpdatedAt",
    "target": "D"
  }
]`

export default defineNuxtComponent({
  name: 'SettingsLifecyclePage',
  provide() {
    return {
      refresh: this.refreshRules,
    }
  },
  data() {
    return {
      targetId: '',
      activeTab: 'rules',
      rulesVisibleColumns: ['name', 'rulesCount', 'sources', 'targets', 'cronExecutable'],
      rulesColumns: [
        {
          name: 'name',
          label: 'Fichier',
          field: (row: LifecycleRuleSummary) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'rulesCount',
          label: 'Règles',
          field: (row: LifecycleRuleSummary) => row.rulesCount,
          align: 'left',
          sortable: true,
        },
        {
          name: 'sources',
          label: 'Sources',
          field: (row: LifecycleRuleSummary) => (row.sources || []).join(', '),
          align: 'left',
          sortable: true,
        },
        {
          name: 'targets',
          label: 'Cibles',
          field: (row: LifecycleRuleSummary) => (row.targets || []).join(', '),
          align: 'left',
          sortable: true,
        },
        {
          name: 'cronExecutable',
          label: 'Exécutable cron',
          field: (row: LifecycleRuleSummary) => row.cronExecutable,
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination({ name: 'settings-lifecycle-rules' })
    const { hasPermission } = useAccessControl()
    const paginationOptions = useHttpPaginationOptions()

    const ruleDialog = ref(false)
    const isCreateRuleMode = ref(false)
    const ruleSaving = ref(false)
    const ruleValidations = reactive<Record<string, string>>({})
    const ruleForm = ref({ name: '', identitiesJson: RULE_TEMPLATE })
    const ruleExecuteLoading = reactive<Record<string, boolean>>({})

    const defaultStates = ref<LifecycleState[]>([])
    const customStates = ref<LifecycleState[]>([])
    const statesDirty = ref(false)
    const statesSaving = ref(false)
    const stateDialog = ref(false)
    const isCreateStateMode = ref(true)
    const stateEditIndex = ref(-1)
    const stateValidations = reactive<Record<string, string>>({})
    const stateForm = ref<LifecycleState>({ key: '', label: '', description: '', icon: '', color: '' })

    const {
      data: lifecycleRules,
      error: rulesError,
      pending: rulesPending,
      refresh: refreshRules,
      execute: executeRules,
    } = await useHttp<any>('/management/lifecycle/config/rules', {
      method: 'get',
      ...paginationOptions,
    })

    if (rulesError.value) {
      throw showError({ statusCode: 500, statusMessage: 'Internal Server Error' })
    }

    useHttpPaginationReactive(paginationOptions, executeRules)

    const { $http } = useNuxtApp()

    const loadStates = async (): Promise<void> => {
      const response = await $http.$get('/management/lifecycle/config/states') as {
        data?: { defaultStates?: LifecycleState[]; customStates?: LifecycleState[] }
      }
      defaultStates.value = response?.data?.defaultStates || []
      customStates.value = [...(response?.data?.customStates || [])]
      statesDirty.value = false
    }

    await loadStates()

    return {
      hasPermission,
      lifecycleRules,
      rulesPending,
      refreshRules,
      ruleDialog,
      isCreateRuleMode,
      ruleSaving,
      ruleValidations,
      ruleForm,
      ruleExecuteLoading,
      defaultStates,
      customStates,
      statesDirty,
      statesSaving,
      stateDialog,
      isCreateStateMode,
      stateEditIndex,
      stateValidations,
      stateForm,
      loadStates,
    }
  },
  computed: {
    rulesRows(): LifecycleRuleSummary[] {
      return this.lifecycleRules?.data || []
    },
    rulesTotal(): number {
      return this.lifecycleRules?.total || 0
    },
    ruleDialogTitle(): string {
      if (this.isCreateRuleMode) {
        return "Création d'un fichier de règles"
      }
      return `Édition : ${this.ruleForm.name}`
    },
  },
  methods: {
    resetRuleValidations(): void {
      Object.keys(this.ruleValidations).forEach((key) => delete this.ruleValidations[key])
    },
    resetStateValidations(): void {
      Object.keys(this.stateValidations).forEach((key) => delete this.stateValidations[key])
    },
    parseIdentitiesJson(): unknown[] | null {
      try {
        const parsed = JSON.parse(this.ruleForm.identitiesJson)
        if (!Array.isArray(parsed)) {
          this.ruleValidations.identities = 'Le contenu doit être un tableau JSON.'
          return null
        }
        return parsed
      } catch {
        this.ruleValidations.identities = 'JSON invalide.'
        return null
      }
    },
    openCreateRuleDialog(): void {
      this.resetRuleValidations()
      this.isCreateRuleMode = true
      this.ruleForm = { name: '', identitiesJson: RULE_TEMPLATE }
      this.ruleDialog = true
    },
    async openEditRuleDialog(row: LifecycleRuleSummary): Promise<void> {
      this.resetRuleValidations()
      this.isCreateRuleMode = false
      try {
        const response = await this.$http.$get(`/management/lifecycle/config/rules/${encodeURIComponent(row.name)}`) as {
          data?: { identities?: unknown[] }
        }
        const identities = response?.data?.identities || []
        this.ruleForm = {
          name: row.name,
          identitiesJson: JSON.stringify(identities, null, 2),
        }
        this.ruleDialog = true
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible de charger le fichier "${row.name}".`,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      }
    },
    async saveRuleForm(): Promise<void> {
      this.resetRuleValidations()
      const name = this.ruleForm.name?.trim()
      if (this.isCreateRuleMode && !name) {
        this.ruleValidations.name = 'Le nom du fichier est obligatoire.'
        return
      }

      const identities = this.parseIdentitiesJson()
      if (identities === null) {
        return
      }

      this.ruleSaving = true
      try {
        if (this.isCreateRuleMode) {
          await this.$http.post('/management/lifecycle/config/rules', {
            body: { name, identities },
          })
          this.$q.notify({
            message: `Fichier de règles "${name}" créé.`,
            color: 'positive',
            position: 'top-right',
            icon: 'mdi-check-circle-outline',
          })
        } else {
          await this.$http.patch(`/management/lifecycle/config/rules/${encodeURIComponent(name)}`, {
            body: { identities },
          })
          this.$q.notify({
            message: `Fichier de règles "${name}" mis à jour.`,
            color: 'positive',
            position: 'top-right',
            icon: 'mdi-check-circle-outline',
          })
        }
        this.ruleDialog = false
        await this.refreshRules()
      } catch (error: any) {
        const action = this.isCreateRuleMode ? 'créer' : 'mettre à jour'
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible de ${action} le fichier de règles.`,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.ruleSaving = false
      }
    },
    deleteRule(row: LifecycleRuleSummary): void {
      this.$q.dialog({
        title: 'Confirmation',
        message: `Voulez-vous vraiment supprimer le fichier de règles "${row.name}" ?`,
        persistent: true,
        ok: { push: true, color: 'positive', label: 'Supprimer' },
        cancel: { push: true, color: 'negative', label: 'Annuler' },
      }).onOk(async () => {
        try {
          await this.$http.delete(`/management/lifecycle/config/rules/${encodeURIComponent(row.name)}`)
          this.$q.notify({
            message: `Fichier "${row.name}" supprimé.`,
            color: 'positive',
            position: 'top-right',
            icon: 'mdi-check-circle-outline',
          })
          await this.refreshRules()
        } catch (error: any) {
          this.$q.notify({
            message: error?.response?._data?.message || `Impossible de supprimer "${row.name}".`,
            color: 'negative',
            position: 'top-right',
            icon: 'mdi-alert-circle-outline',
          })
        }
      })
    },
    async executeRule(row: LifecycleRuleSummary): Promise<void> {
      this.ruleExecuteLoading[row.name] = true
      try {
        await this.$http.post(`/management/lifecycle/config/rules/${encodeURIComponent(row.name)}/execute`)
        this.$q.notify({
          message: `Exécution lancée pour "${row.name}".`,
          color: 'positive',
          position: 'bottom',
          icon: 'mdi-play-circle-outline',
        })
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible d'exécuter "${row.name}".`,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.ruleExecuteLoading[row.name] = false
      }
    },
    openCreateStateDialog(): void {
      this.resetStateValidations()
      this.isCreateStateMode = true
      this.stateEditIndex = -1
      this.stateForm = { key: '', label: '', description: '', icon: 'mdi-account', color: '#888888' }
      this.stateDialog = true
    },
    openEditStateDialog(index: number): void {
      this.resetStateValidations()
      this.isCreateStateMode = false
      this.stateEditIndex = index
      this.stateForm = { ...this.customStates[index] }
      this.stateDialog = true
    },
    applyStateForm(): void {
      this.resetStateValidations()
      const key = this.stateForm.key?.trim()
      if (!key || key.length !== 1) {
        this.stateValidations.key = 'La clé doit être un seul caractère.'
        return
      }
      if (['O', 'I', 'M'].includes(key)) {
        this.stateValidations.key = 'Cette clé est réservée aux états par défaut.'
        return
      }
      if (!this.stateForm.label?.trim()) {
        this.stateValidations.label = 'Le label est obligatoire.'
        return
      }
      if (!this.stateForm.description?.trim()) {
        this.stateValidations.description = 'La description est obligatoire.'
        return
      }

      const duplicate = this.customStates.findIndex((state) => state.key === key)
      if (this.isCreateStateMode && duplicate !== -1) {
        this.stateValidations.key = 'Cette clé existe déjà.'
        return
      }
      if (!this.isCreateStateMode && duplicate !== -1 && duplicate !== this.stateEditIndex) {
        this.stateValidations.key = 'Cette clé existe déjà.'
        return
      }

      const nextState = {
        key,
        label: this.stateForm.label.trim(),
        description: this.stateForm.description.trim(),
        icon: this.stateForm.icon?.trim() || undefined,
        color: this.stateForm.color?.trim() || undefined,
      }

      if (this.isCreateStateMode) {
        this.customStates.push(nextState)
      } else if (this.stateEditIndex >= 0) {
        this.customStates[this.stateEditIndex] = nextState
      }

      this.statesDirty = true
      this.stateDialog = false
    },
    deleteState(index: number): void {
      const state = this.customStates[index]
      this.$q.dialog({
        title: 'Confirmation',
        message: `Supprimer l'état "${state.key}" (${state.label}) ?`,
        persistent: true,
        ok: { push: true, color: 'positive', label: 'Supprimer' },
        cancel: { push: true, color: 'negative', label: 'Annuler' },
      }).onOk(() => {
        this.customStates.splice(index, 1)
        this.statesDirty = true
      })
    },
    async saveStates(): Promise<void> {
      this.statesSaving = true
      try {
        await this.$http.put('/management/lifecycle/config/states', {
          body: { states: this.customStates },
        })
        this.$q.notify({
          message: 'États personnalisés enregistrés.',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        await this.loadStates()
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || 'Impossible d\'enregistrer les états.',
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.statesSaving = false
      }
    },
  },
})
</script>

<style lang="sass" scoped>
.lifecycle-settings-content
  height: 100%
  min-height: 0
  overflow: hidden

.lifecycle-settings-panels
  min-height: 0

.lifecycle-rules-panel
  position: relative
  height: 100%
  min-height: 0
</style>
