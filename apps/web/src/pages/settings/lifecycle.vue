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
          q-markup-table.lifecycle-states-table(dense flat bordered v-if='customStates.length')
            thead
              tr
                th.text-left Clé
                th.text-left Label
                th.text-left.lifecycle-states-description Description
                th.text-left Icône
                th.text-left Couleur
                th.text-right Actions
            tbody
              tr(v-for='(state, index) in customStates' :key='state.key')
                td
                  q-badge(:style='{ backgroundColor: state.color || "#888" }') {{ state.key }}
                td {{ state.label }}
                td.text-caption.lifecycle-states-description
                  span.lifecycle-states-description-text(:title='state.description') {{ state.description }}
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
          .row.items-center.q-mb-sm
            .text-subtitle2 Règles de transition
            q-space
            q-btn(
              :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
              color='primary'
              icon='mdi-plus'
              label='Ajouter une règle'
              dense flat
              @click='addRuleItem'
            )
          q-banner.rounded-borders(dense v-if='!ruleForm.identities.length' :class='{ "bg-grey-2 text-grey-9": !$q.dark.isActive, "bg-grey-8 text-white": $q.dark.isActive }')
            | Aucune règle définie. Ajoutez au moins une règle de transition.
          q-expansion-item.lifecycle-rule-item(
            v-for='(rule, index) in ruleForm.identities'
            :key='rule._id'
            dense
            expand-separator
            :label='ruleItemLabel(rule, index)'
            :caption='ruleItemCaption(rule)'
            header-class='text-primary'
            default-opened
          )
            q-card(flat bordered)
              q-card-section
                .column.q-gutter-md
                  q-select(
                    :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                    outlined dense multiple use-chips
                    emit-value map-options
                    v-model='rule.sources'
                    :options='getStateKeyOptions(rule)'
                    label='États source'
                    hint="États depuis lesquels la transition peut s'appliquer"
                    :error='!!ruleValidations[`rule:${index}:sources`]'
                    :error-message='ruleValidations[`rule:${index}:sources`]'
                    @update:model-value='scheduleRuleFilterPreview(rule)'
                  )
                  q-select(
                    :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                    outlined dense
                    emit-value map-options
                    v-model='rule.target'
                    :options='getStateKeyOptions(rule)'
                    label='État cible'
                    :error='!!ruleValidations[`rule:${index}:target`]'
                    :error-message='ruleValidations[`rule:${index}:target`]'
                  )
                  q-input(
                    :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                    outlined dense
                    v-model='rule.triggerInput'
                    label='Déclencheur (trigger)'
                    hint='-1 = cron/CLI · secondes (ex. 3600) · 90d · 50m · 5s'
                    :error='!!ruleValidations[`rule:${index}:trigger`]'
                    :error-message='ruleValidations[`rule:${index}:trigger`]'
                    @update:model-value='scheduleRuleFilterPreview(rule)'
                  )
                    template(#append)
                      q-btn(flat dense round icon='mdi-timer-off-outline' @click='rule.triggerInput = "-1"')
                        q-tooltip Définir sur -1 (exécution cron/CLI)
                  q-input(
                    :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                    outlined dense type='textarea' autogrow
                    v-model='rule.rulesJson'
                    label='Filtre MongoDB (rules)'
                    hint='Requête de filtrage sur le document identité'
                    input-style='font-family: ui-monospace, monospace; min-height: 80px;'
                    :error='!!ruleValidations[`rule:${index}:rules`]'
                    :error-message='ruleValidations[`rule:${index}:rules`]'
                    @update:model-value='scheduleRuleFilterPreview(rule)'
                  )
                  .lifecycle-preview-panel(v-if='getRulePreview(rule._id)?.filter || getRulePreview(rule._id)?.filterLoading || getRulePreview(rule._id)?.filterError')
                    .row.items-center.q-mb-xs
                      .text-caption.text-weight-medium Prévisualisation du filtre MongoDB
                      q-space
                      q-spinner-dots(v-if='getRulePreview(rule._id)?.filterLoading' color='primary' size='20px')
                    .text-negative.text-caption.q-mb-xs(v-if='getRulePreview(rule._id)?.filterError') {{ getRulePreview(rule._id)?.filterError }}
                    template(v-else-if='getRulePreview(rule._id)?.filter')
                      .text-caption.q-mb-xs {{ getRulePreview(rule._id)?.filter?.temporalFilter?.note }}
                      .text-body2.q-mb-sm
                        strong {{ getRulePreview(rule._id)?.filter?.count ?? 0 }}
                        |  identité(s) correspondante(s)
                      q-markup-table.lifecycle-preview-table(dense flat bordered v-if='getRulePreview(rule._id)?.filter?.samples?.length')
                        thead
                          tr
                            th.text-left CN
                            th.text-left État
                            th.text-left E-mail
                            th.text-left ID
                        tbody
                          tr(v-for='sample in getRulePreview(rule._id)?.filter?.samples' :key='sample._id')
                            td {{ sample.cn || '—' }}
                            td {{ sample.lifecycle || '—' }}
                            td {{ sample.mail || '—' }}
                            td.text-monospace.text-caption {{ sample._id }}
                      .text-caption.text-grey-7.q-mt-xs(v-else) Aucun échantillon à afficher.
                      q-expansion-item.lifecycle-preview-query(
                        dense
                        expand-separator
                        label='Requête MongoDB'
                        header-class='text-caption'
                      )
                        pre.lifecycle-preview-code {{ formatPreviewJson(getRulePreview(rule._id)?.filter?.query) }}
                  q-input(
                    :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                    outlined dense type='textarea' autogrow
                    v-model='rule.mutationJson'
                    label='Mutation (optionnel)'
                    hint='Champs à modifier lors de la transition (JSON, variables Liquid : date.today, date.isoNow, …)'
                    input-style='font-family: ui-monospace, monospace; min-height: 60px;'
                    :error='!!ruleValidations[`rule:${index}:mutation`]'
                    :error-message='ruleValidations[`rule:${index}:mutation`]'
                    @update:model-value='scheduleRuleMutationPreview(rule)'
                  )
                  .lifecycle-preview-panel(v-if='getRulePreview(rule._id)?.mutation || getRulePreview(rule._id)?.mutationLoading || getRulePreview(rule._id)?.mutationError')
                    .row.items-center.q-mb-xs
                      .text-caption.text-weight-medium Prévisualisation de la mutation
                      q-space
                      q-spinner-dots(v-if='getRulePreview(rule._id)?.mutationLoading' color='primary' size='20px')
                    .text-negative.text-caption.q-mb-xs(v-if='getRulePreview(rule._id)?.mutationError') {{ getRulePreview(rule._id)?.mutationError }}
                    template(v-else-if='getRulePreview(rule._id)?.mutation')
                      q-expansion-item.lifecycle-preview-variables(
                        dense
                        expand-separator
                        :label='getTemplateVariablesLabel(rule._id)'
                        header-class='text-caption'
                      )
                        q-markup-table.lifecycle-preview-table.lifecycle-preview-variables-table(
                          dense flat bordered
                          :class='$q.dark.isActive ? "text-grey-3" : "text-grey-9"'
                        )
                          thead
                            tr
                              th.text-left(:class='$q.dark.isActive ? "text-grey-5" : "text-grey-7"') Variable
                              th.text-left(:class='$q.dark.isActive ? "text-grey-5" : "text-grey-7"') Valeur actuelle
                          tbody
                            tr(v-for='(value, key) in getRulePreview(rule._id)?.mutation?.templateVariables' :key='key')
                              td.text-monospace.text-caption(:class='$q.dark.isActive ? "text-grey-5" : "text-grey-7"') {{ key }}
                              td.text-monospace.text-caption {{ value }}
                      .text-caption.q-mt-sm Après résolution des variables
                      pre.lifecycle-preview-code {{ formatPreviewJson(getRulePreview(rule._id)?.mutation?.resolved) }}
                  .row.justify-end
                    q-btn(
                      :disable='!hasPermission("/management/lifecycle", isCreateRuleMode ? "create" : "update")'
                      color='negative'
                      icon='mdi-delete'
                      label='Supprimer cette règle'
                      flat dense
                      @click='removeRuleItem(index)'
                    )
          .text-negative.text-caption.q-mt-sm(v-if='ruleValidations.identities') {{ ruleValidations.identities }}
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

type RuleFormItem = {
  _id: string
  sources: string[]
  target: string
  triggerInput: string
  rulesJson: string
  dateKey: string
  mutationJson: string
  _extra?: Record<string, unknown>
}

type RuleMutationPreview = {
  raw: Record<string, unknown>
  resolved: Record<string, unknown>
  templateVariables: Record<string, string>
}

type RuleFilterPreview = {
  query: Record<string, unknown>
  count: number
  samples: Array<{
    _id: string
    lifecycle?: string
    cn?: string
    mail?: string
  }>
  temporalFilter?: {
    applied?: boolean
    note?: string
  }
}

type RulePreviewState = {
  mutationLoading?: boolean
  mutation?: RuleMutationPreview
  mutationError?: string
  filterLoading?: boolean
  filter?: RuleFilterPreview
  filterError?: string
}

let ruleItemSeq = 0

function createEmptyRuleItem(): RuleFormItem {
  ruleItemSeq += 1
  return {
    _id: `rule-${ruleItemSeq}`,
    sources: [],
    target: '',
    triggerInput: '-1',
    rulesJson: '{}',
    dateKey: 'metadata.lastUpdatedAt',
    mutationJson: '',
  }
}

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
    const ruleForm = ref<{ name: string; identities: RuleFormItem[] }>({
      name: '',
      identities: [createEmptyRuleItem()],
    })
    const rulePreviewState = reactive<Record<string, RulePreviewState>>({})
    const rulePreviewTimers = new Map<string, { mutation?: ReturnType<typeof setTimeout>; filter?: ReturnType<typeof setTimeout> }>()

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
      rulePreviewState,
      rulePreviewTimers,
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
    getRulePreview(ruleId: string): RulePreviewState | undefined {
      return this.rulePreviewState[ruleId]
    },
    formatPreviewJson(value: unknown): string {
      if (value === undefined || value === null) {
        return ''
      }
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return `${value}`
      }
    },
    getTemplateVariablesLabel(ruleId: string): string {
      const variables = this.getRulePreview(ruleId)?.mutation?.templateVariables
      const count = variables ? Object.keys(variables).length : 0
      return `Variables disponibles (${count})`
    },
    clearRulePreview(ruleId: string): void {
      delete this.rulePreviewState[ruleId]
      const timers = this.rulePreviewTimers.get(ruleId)
      if (timers?.mutation) {
        clearTimeout(timers.mutation)
      }
      if (timers?.filter) {
        clearTimeout(timers.filter)
      }
      this.rulePreviewTimers.delete(ruleId)
    },
    scheduleRuleMutationPreview(rule: RuleFormItem): void {
      const timers = this.rulePreviewTimers.get(rule._id) || {}
      if (timers.mutation) {
        clearTimeout(timers.mutation)
      }
      timers.mutation = window.setTimeout(() => {
        void this.previewRuleMutation(rule)
      }, 500)
      this.rulePreviewTimers.set(rule._id, timers)
    },
    scheduleRuleFilterPreview(rule: RuleFormItem): void {
      const timers = this.rulePreviewTimers.get(rule._id) || {}
      if (timers.filter) {
        clearTimeout(timers.filter)
      }
      timers.filter = window.setTimeout(() => {
        void this.previewRuleFilter(rule)
      }, 500)
      this.rulePreviewTimers.set(rule._id, timers)
    },
    parseJsonObjectForPreview(raw: string): { value?: Record<string, unknown>; error?: string } {
      const trimmed = `${raw || ''}`.trim()
      if (!trimmed || trimmed === '{}') {
        return { value: undefined }
      }
      try {
        const parsed = JSON.parse(trimmed)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          return { error: 'Un objet JSON est attendu.' }
        }
        return { value: parsed as Record<string, unknown> }
      } catch {
        return { error: 'JSON invalide.' }
      }
    },
    async previewRuleMutation(rule: RuleFormItem): Promise<void> {
      const parsed = this.parseJsonObjectForPreview(rule.mutationJson)
      if (!parsed.value && !parsed.error) {
        const state = this.rulePreviewState[rule._id] || {}
        delete state.mutation
        delete state.mutationError
        delete state.mutationLoading
        this.rulePreviewState[rule._id] = state
        return
      }

      if (parsed.error) {
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          mutationError: parsed.error,
          mutation: undefined,
          mutationLoading: false,
        }
        return
      }

      this.rulePreviewState[rule._id] = {
        ...this.rulePreviewState[rule._id],
        mutationLoading: true,
        mutationError: undefined,
      }

      try {
        const response = await this.$http.$post('/management/lifecycle/config/preview/mutation', {
          body: { mutation: parsed.value },
        }) as { data?: RuleMutationPreview }
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          mutation: response?.data,
          mutationLoading: false,
          mutationError: undefined,
        }
      } catch (error: any) {
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          mutationLoading: false,
          mutationError: error?.response?._data?.message || 'Impossible de prévisualiser la mutation.',
        }
      }
    },
    async previewRuleFilter(rule: RuleFormItem): Promise<void> {
      if (!rule.sources?.length) {
        const state = this.rulePreviewState[rule._id] || {}
        delete state.filter
        delete state.filterError
        delete state.filterLoading
        this.rulePreviewState[rule._id] = state
        return
      }

      const parsed = this.parseJsonObjectForPreview(rule.rulesJson)
      if (parsed.error) {
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          filterError: parsed.error,
          filter: undefined,
          filterLoading: false,
        }
        return
      }

      this.rulePreviewState[rule._id] = {
        ...this.rulePreviewState[rule._id],
        filterLoading: true,
        filterError: undefined,
      }

      try {
        const response = await this.$http.$post('/management/lifecycle/config/preview/filter', {
          body: {
            sources: rule.sources,
            rules: parsed.value || {},
            triggerInput: rule.triggerInput,
            dateKey: rule.dateKey,
            sampleLimit: 5,
          },
        }) as { data?: RuleFilterPreview }
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          filter: response?.data,
          filterLoading: false,
          filterError: undefined,
        }
      } catch (error: any) {
        this.rulePreviewState[rule._id] = {
          ...this.rulePreviewState[rule._id],
          filterLoading: false,
          filterError: error?.response?._data?.message || 'Impossible de prévisualiser le filtre.',
        }
      }
    },
    getStateKeyOptions(rule?: RuleFormItem): Array<{ label: string; value: string }> {
      const options = [...this.defaultStates, ...this.customStates].map((state) => ({
        label: `${state.key} — ${state.label}`,
        value: state.key,
      }))
      const seen = new Set(options.map((option) => option.value))
      const extraKeys = rule ? [...(rule.sources || []), rule.target].filter(Boolean) : []
      for (const key of extraKeys) {
        if (!seen.has(key)) {
          options.push({ label: `${key} (hors liste)`, value: key })
          seen.add(key)
        }
      }
      return options
    },
    resetRuleValidations(): void {
      Object.keys(this.ruleValidations).forEach((key) => delete this.ruleValidations[key])
    },
    resetStateValidations(): void {
      Object.keys(this.stateValidations).forEach((key) => delete this.stateValidations[key])
    },
    ruleItemLabel(rule: RuleFormItem, index: number): string {
      const sources = rule.sources?.length ? rule.sources.join(', ') : '?'
      const target = rule.target || '?'
      return `Règle ${index + 1} : [${sources}] → ${target}`
    },
    ruleItemCaption(rule: RuleFormItem): string {
      const trigger = rule.triggerInput?.trim() || 'sans déclencheur'
      return `trigger: ${trigger}`
    },
    addRuleItem(): void {
      this.ruleForm.identities.push(createEmptyRuleItem())
    },
    removeRuleItem(index: number): void {
      this.ruleForm.identities.splice(index, 1)
    },
    formatTriggerForDisplay(trigger: unknown): string {
      if (trigger === -1 || trigger === '-1') {
        return '-1'
      }
      if (trigger === undefined || trigger === null || trigger === '') {
        return ''
      }
      return String(trigger)
    },
    parseTriggerInput(input: string): number | string | null | undefined {
      const trimmed = `${input || ''}`.trim()
      if (!trimmed) {
        return undefined
      }
      if (trimmed === '-1') {
        return -1
      }
      if (/^\d+[dms]$/.test(trimmed)) {
        return trimmed
      }
      if (/^\d+$/.test(trimmed)) {
        const seconds = parseInt(trimmed, 10)
        if (seconds > 0) {
          return seconds
        }
      }
      return null
    },
    parseJsonObject(raw: string, fieldName: string, index: number): Record<string, unknown> | null | undefined {
      const trimmed = `${raw || ''}`.trim()
      if (!trimmed || trimmed === '{}') {
        return undefined
      }
      try {
        const parsed = JSON.parse(trimmed)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          this.ruleValidations[`rule:${index}:${fieldName}`] = 'Un objet JSON est attendu.'
          return null
        }
        return parsed as Record<string, unknown>
      } catch {
        this.ruleValidations[`rule:${index}:${fieldName}`] = 'JSON invalide.'
        return null
      }
    },
    identityFromApiToForm(identity: Record<string, unknown>): RuleFormItem {
      const knownKeys = new Set(['sources', 'target', 'trigger', 'rules', 'mutation', 'dateKey'])
      const extra: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(identity)) {
        if (!knownKeys.has(key)) {
          extra[key] = value
        }
      }

      ruleItemSeq += 1
      return {
        _id: `rule-${ruleItemSeq}`,
        sources: Array.isArray(identity.sources) ? [...identity.sources as string[]] : [],
        target: `${identity.target || ''}`,
        triggerInput: this.formatTriggerForDisplay(identity.trigger),
        rulesJson: identity.rules ? JSON.stringify(identity.rules, null, 2) : '{}',
        dateKey: `${identity.dateKey || 'metadata.lastUpdatedAt'}`,
        mutationJson: identity.mutation ? JSON.stringify(identity.mutation, null, 2) : '',
        _extra: Object.keys(extra).length ? extra : undefined,
      }
    },
    buildIdentityFromFormItem(item: RuleFormItem, index: number): Record<string, unknown> | null {
      if (!item.sources?.length) {
        this.ruleValidations[`rule:${index}:sources`] = 'Sélectionnez au moins un état source.'
        return null
      }
      if (!item.target) {
        this.ruleValidations[`rule:${index}:target`] = "L'état cible est obligatoire."
        return null
      }

      const trigger = this.parseTriggerInput(item.triggerInput)
      if (item.triggerInput?.trim() && trigger === null) {
        this.ruleValidations[`rule:${index}:trigger`] = 'Format invalide. Utilisez -1, un nombre de secondes, ou 90d / 50m / 5s.'
        return null
      }

      const rules = this.parseJsonObject(item.rulesJson, 'rules', index)
      if (rules === null) {
        return null
      }

      const mutation = this.parseJsonObject(item.mutationJson, 'mutation', index)
      if (mutation === null) {
        return null
      }

      const hasRules = !!rules && Object.keys(rules).length > 0
      const hasTrigger = trigger !== undefined && trigger !== null
      if (!hasRules && !hasTrigger) {
        this.ruleValidations[`rule:${index}:trigger`] = 'Renseignez un trigger ou un filtre rules.'
        return null
      }

      const identity: Record<string, unknown> = { ...(item._extra || {}) }
      identity.sources = item.sources
      identity.target = item.target
      if (item.dateKey?.trim()) {
        identity.dateKey = item.dateKey.trim()
      }
      if (trigger !== undefined) {
        identity.trigger = trigger
      }
      if (rules) {
        identity.rules = rules
      }
      if (mutation) {
        identity.mutation = mutation
      }

      return identity
    },
    buildIdentitiesFromForm(): Record<string, unknown>[] | null {
      if (!this.ruleForm.identities.length) {
        this.ruleValidations.identities = 'Ajoutez au moins une règle.'
        return null
      }

      const identities: Record<string, unknown>[] = []
      for (let index = 0; index < this.ruleForm.identities.length; index++) {
        const built = this.buildIdentityFromFormItem(this.ruleForm.identities[index], index)
        if (!built) {
          return null
        }
        identities.push(built)
      }

      return identities
    },
    openCreateRuleDialog(): void {
      this.resetRuleValidations()
      this.isCreateRuleMode = true
      Object.keys(this.rulePreviewState).forEach((key) => this.clearRulePreview(key))
      this.ruleForm = {
        name: '',
        identities: [createEmptyRuleItem()],
      }
      this.ruleDialog = true
    },
    async openEditRuleDialog(row: LifecycleRuleSummary): Promise<void> {
      this.resetRuleValidations()
      this.isCreateRuleMode = false
      try {
        const response = await this.$http.$get(`/management/lifecycle/config/rules/${encodeURIComponent(row.name)}`) as {
          data?: { identities?: Record<string, unknown>[] }
        }
        const identities = response?.data?.identities || []
        Object.keys(this.rulePreviewState).forEach((key) => this.clearRulePreview(key))
        this.ruleForm = {
          name: row.name,
          identities: identities.length
            ? identities.map((identity) => this.identityFromApiToForm(identity))
            : [createEmptyRuleItem()],
        }
        this.ruleDialog = true
        this.$nextTick(() => {
          for (const rule of this.ruleForm.identities) {
            this.scheduleRuleFilterPreview(rule)
            this.scheduleRuleMutationPreview(rule)
          }
        })
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

      const identities = this.buildIdentitiesFromForm()
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

.lifecycle-rule-item
  border: 1px solid rgba(0, 0, 0, 0.12)
  border-radius: 4px
  margin-bottom: 8px

.lifecycle-preview-panel
  padding: 8px 10px
  border-radius: 4px
  background: rgba(0, 0, 0, 0.03)

.lifecycle-preview-code
  margin: 0
  padding: 8px
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  font-size: 11px
  line-height: 1.35
  white-space: pre-wrap
  word-break: break-word
  max-height: 220px
  overflow: auto
  background: rgba(0, 0, 0, 0.04)
  border-radius: 4px

.lifecycle-preview-table
  font-size: 12px

.lifecycle-preview-variables-table
  margin-top: 4px

  td:first-child
    white-space: nowrap
    width: 1%

.lifecycle-states-table
  .lifecycle-states-description
    max-width: 240px

  .lifecycle-states-description-text
    display: block
    overflow: hidden
    text-overflow: ellipsis
    white-space: nowrap
</style>
