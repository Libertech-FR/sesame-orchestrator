<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Tâches Cron'
      ref='twoPan'
      :simple='true'
      :loading='pending'
      :rows='cronTasks?.data || []'
      :total='cronTasks?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='name'
    )
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par nom, description, ...')
      template(v-slot:row-actions='{ row }')
        q-btn(
          :disable='!hasPermission("/core/cron", "read")'
          color='primary'
          icon='mdi-eye'
          size='12px'
          flat
          round
          dense
          @click='openEditDialog(row)'
        )
          q-tooltip.text-body2 Consulter / modifier la tâche
        q-btn(
          :disable='!hasPermission("/core/cron", "update")'
          :loading='!!cronToggleLoading[row.name]'
          :color='row.enabled ? "positive" : "warning"'
          :icon='row.enabled ? "mdi-toggle-switch-outline" : "mdi-toggle-switch-off-outline"'
          size='12px'
          flat
          round
          dense
          @click='toggleCronEnabled(row)'
        )
          q-tooltip.text-body2 {{ row.enabled ? 'Désactiver' : 'Activer' }} la tâche
        q-btn(
          :disable='!hasPermission("/core/cron", "update")'
          :loading='!!cronRunLoading[row.name]'
          color='purple'
          icon='mdi-play-circle-outline'
          size='12px'
          flat
          round
          dense
          @click='runCronImmediately(row)'
        )
          q-tooltip.text-body2 Exécuter immédiatement
        q-btn(
          :disable='!hasPermission("/core/cron", "read")'
          color='primary'
          icon='mdi-file-document-outline'
          size='12px'
          flat
          round
          dense
          @click='openLogsModal(row)'
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/core/cron', 'read')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
      template(#body-cell-enabled="props")
        q-td
          q-checkbox(:model-value="props.row.enabled" :disable="true" size="xs")
  q-dialog(v-model='editDialog' persistent)
    q-card(style='min-width: 560px; max-width: 90vw;')
      q-toolbar.bg-primary.text-white(bordered dense flat style='height: 32px; line-height: 32px;')
        q-toolbar-title Édition de la tâche cron
        q-btn(flat round dense icon='mdi-close' v-close-popup)
      q-card-section.q-pt-md
        .column.q-gutter-md
          q-input(
            outlined
            dense
            readonly
            v-model='editForm.name'
            label='Nom de la tâche'
          )
          q-input(
            :disable='!hasPermission("/core/cron", "update")'
            outlined
            dense
            v-model='editForm.description'
            label='Description'
            autogrow
          )
          q-input(
            :disable='!hasPermission("/core/cron", "update")'
            outlined
            dense
            v-model='editForm.schedule'
            label='Expression cron'
            hint='Exemple : */5 * * * * (toutes les 5 minutes)'
            :error='!!editValidations.schedule'
            :error-message='editValidations.schedule'
          )
          q-select(
            :disable='!hasPermission("/core/cron", "update")'
            outlined
            dense
            emit-value
            map-options
            option-value='handler'
            option-label='handler'
            v-model='editForm.handler'
            :options='handlerSelectOptions'
            label='Handler (commande console)'
            hint='Correspond à yarn run console + la commande sélectionnée'
            :error='!!editValidations.handler'
            :error-message='editValidations.handler'
            @update:model-value='onHandlerChange'
          )
            template(#option='scope')
              q-item(v-bind='scope.itemProps')
                q-item-section
                  q-item-label {{ scope.opt.handler }}
                  q-item-label.caption yarn run console {{ scope.opt.command }}
                  q-item-label.caption(v-if='scope.opt.label !== scope.opt.handler') {{ scope.opt.label }}
          template(v-if='editForm.handler')
            q-separator.q-my-sm
            .text-subtitle2.q-mt-none Arguments de la commande
            .text-caption.text-grey-7.q-my-none Les valeurs sont transmises en options CLI (--nom=valeur).
            template(v-if='selectedHandlerArguments.length')
              template(v-for='argument in selectedHandlerArguments' :key='argument.name')
                q-toggle(
                  v-if='argument.type === "boolean"'
                  :disable='!hasPermission("/core/cron", "update")'
                  dense
                  v-model='editForm.arguments[argument.name]'
                  :label='argument.label || argument.name'
                  color='primary'
                )
                  q-tooltip.text-body2(v-if='argument.description') {{ argument.description }}
                q-input(
                  v-else
                  :disable='!hasPermission("/core/cron", "update")'
                  outlined
                  dense
                  v-model='editForm.arguments[argument.name]'
                  :label='argument.label || argument.name'
                  :hint='argument.description'
                  :type='argument.type === "number" ? "number" : "text"'
                  :error='!!editValidations[`arg:${argument.name}`]'
                  :error-message='editValidations[`arg:${argument.name}`]'
                )
            .text-caption.text-grey-7(v-else) Cette commande ne déclare aucun argument configurable.
            template(v-if='unrecognizedArguments.length')
              .text-caption.text-grey-7.q-mt-sm Arguments non reconnus (conservés)
              template(v-for='argument in unrecognizedArguments' :key='argument.name')
                q-input(
                  :disable='!hasPermission("/core/cron", "update")'
                  outlined
                  dense
                  v-model='editForm.arguments[argument.name]'
                  :label='argument.name'
                  hint='Argument présent dans la configuration mais absent du schéma du handler.'
                )
            q-banner.rounded-borders(dense v-if='commandPreview' :class='{ "bg-grey-2 text-grey-9": !$q.dark.isActive, "bg-grey-8 text-white": $q.dark.isActive }')
              template(#avatar)
                q-icon(name='mdi-console' color='primary')
              .text-caption Prévisualisation
              small.text-body3.text-monospace.q-mt-xs Cette commande doit être exécutée dans le conteneur Sesame Orchestrator.
              .text-body2.text-monospace.q-mt-xs {{ commandPreview }}
      q-card-actions(align='right')
        q-btn(flat label='Annuler' v-close-popup)
        q-btn(
          :disable='!hasPermission("/core/cron", "update")'
          :loading='editSaving'
          color='positive'
          push
          label='Enregistrer'
          icon='mdi-content-save'
          @click='saveEditForm'
        )
  q-dialog(v-model='logsDialog' maximized)
    q-card.fit.column.no-wrap(style='overflow: hidden;')
      q-toolbar.bg-info.text-white(bordered dense style='height: 28px; line-height: 28px;')
        q-toolbar-title
          span Logs de la tâche "{{ selectedCronName }}"
          span.q-ml-sm.text-caption(v-if='logsDialog && selectedCronName') (Actualisation dans {{ logsAutoRefreshCountdown }}s)
        q-space
        q-btn(
          flat
          round
          dense
          icon='mdi-play-circle-outline'
          :loading='logsRunLoading'
          :disable='!selectedCronName'
          @click='runSelectedCronImmediately'
        )
          q-tooltip.text-body2(anchor='top middle' self='bottom middle') Exécuter immédiatement
        q-separator.q-mx-xs(vertical inset)
        q-btn(flat round dense icon='mdi-refresh' :loading='logsLoading' @click='loadCronLogs')
          q-tooltip.text-body2(anchor='top middle' self='bottom middle') Actualiser les logs
        q-btn(flat round dense icon='mdi-close' v-close-popup)
          q-tooltip.text-body2(anchor='top middle' self='bottom middle') Fermer
      q-separator
      q-card-section.col.q-pa-none(ref='logsContainer' style='min-height: 0; overflow: auto;')
        q-inner-loading(:showing='logsLoading')
        div.text-center(v-if='!logsLoading && !logsExists').text-grey-7 Aucun fichier de log trouvé pour cette tâche.
        client-only(v-if='logsExists')
          LazyMonacoEditor.fit(
            ref='logsMonacoEditor'
            :model-value="logsContent || 'Aucun contenu de log.'"
            :options='logsMonacoOptions'
            lang='shell'
            @load='onLogsEditorLoad'
          )
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { computed, reactive, ref } from 'vue'
import { NewTargetId } from '~/constants/variables'

type CronEditForm = {
  name: string
  description: string
  schedule: string
  handler: string
  arguments: Record<string, string | number | boolean>
}

type CronConsoleHandlerArgument = {
  name: string
  label?: string
  description?: string
  type?: 'string' | 'number' | 'boolean'
  default?: string | number | boolean
  required?: boolean
  flag?: string
  positional?: boolean
}

type CronConsoleHandler = {
  handler: string
  command: string
  label: string
  arguments?: CronConsoleHandlerArgument[]
}

export default defineNuxtComponent({
  name: 'SettingsCronPage',
  data() {
    return {
      NewTargetId,
      visibleColumns: ['name', 'description', 'schedule', 'enabled', 'nextExecution'],
      columns: [
        {
          name: 'name',
          label: 'Nom de la tâche',
          field: (row) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'description',
          label: 'Description',
          field: (row) => row.description,
          align: 'left',
          sortable: true,
        },
        {
          name: 'schedule',
          label: 'Schedule',
          field: (row) => row.schedule,
          align: 'left',
          sortable: true,
        },
        {
          name: 'enabled',
          label: 'Activée',
          field: (row) => row.enabled,
          align: 'left',
          sortable: true,
        },
        {
          name: 'nextExecution',
          label: 'Prochaine exécution',
          field: (row) => this.getNextExecution(row),
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  provide() {
    return {
      refresh: this.refresh,
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination({ name: 'settings-cron' })
    const { toPathWithQueries, navigateToTab } = useRouteQueries()
    const { hasPermission } = useAccessControl()
    const { monacoOptions } = useDebug()

    const editorEl = useTemplateRef<HTMLDivElement>('logsMonacoEditor')

    const paginationOptions = useHttpPaginationOptions()
    const logsDialog = ref(false)
    const selectedCronName = ref('')
    const logsLoading = ref(false)
    const logsTail = ref(250)
    const logsTailStep = 250
    const logsTailMax = 5_000
    const logsFullyLoaded = ref(false)
    const logsContent = ref('')
    const logsExists = ref(false)
    const logsMonacoEditor = ref<any>(null)
    const logsScrollDispose = ref<null | (() => void)>(null)
    const logsLoadingMore = ref(false)
    const logsRunLoading = ref(false)
    const logsAutoRefreshMs = ref(60_000)
    const logsAutoRefreshTimer = ref<ReturnType<typeof setInterval> | null>(null)
    const logsAutoRefreshCountdown = ref(5)
    const cronToggleLoading = reactive<Record<string, boolean>>({})
    const cronRunLoading = reactive<Record<string, boolean>>({})
    const editDialog = ref(false)
    const editSaving = ref(false)
    const editValidations = reactive<Record<string, string>>({})
    const editForm = ref<CronEditForm>({
      name: '',
      description: '',
      schedule: '',
      handler: '',
      arguments: {},
    })
    const originalTaskOptions = ref<Record<string, unknown>>({})
    const cronHandlers = ref<CronConsoleHandler[]>([])
    const logsMonacoOptions = computed(() => ({
      ...monacoOptions.value,
      minimap: { enabled: false },
      readOnly: true,
      wordWrap: 'off',
      scrollBeyondLastLine: false,
      lineNumbers: 'off',
      folding: false,
      glyphMargin: false,
    }))

    const {
      data: cronTasks,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<any>('/core/cron', {
      method: 'get',
      ...paginationOptions,
    })
    if (error.value) {
      console.error(error.value)
      throw showError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      })
    }

    useHttpPaginationReactive(paginationOptions, execute)

    const { data: cronHandlersResult } = await useHttp<{ data: CronConsoleHandler[] }>('/core/cron/handlers', {
      method: 'get',
    })
    if (cronHandlersResult.value?.data) {
      cronHandlers.value = cronHandlersResult.value.data
    }

    return {
      cronTasks,
      pending,
      refresh,
      toPathWithQueries,
      navigateToTab,
      hasPermission,
      editorEl,
      logsDialog,
      selectedCronName,
      logsLoading,
      logsTail,
      logsTailStep,
      logsTailMax,
      logsFullyLoaded,
      logsContent,
      logsExists,
      logsMonacoEditor,
      logsScrollDispose,
      logsLoadingMore,
      logsRunLoading,
      logsAutoRefreshMs,
      logsAutoRefreshTimer,
      logsAutoRefreshCountdown,
      cronToggleLoading,
      cronRunLoading,
      editDialog,
      editSaving,
      editValidations,
      editForm,
      originalTaskOptions,
      cronHandlers,
      logsMonacoOptions,
    }
  },
  watch: {
    logsDialog(isOpen: boolean): void {
      if (isOpen) {
        this.startLogsAutoRefresh()
        return
      }

      this.stopLogsAutoRefresh()
      this.resetLogsViewerState()
    },
  },
  beforeUnmount(): void {
    this.stopLogsAutoRefresh()
    this.resetLogsViewerState()
  },
  computed: {
    targetId(): LocationQueryValue[] | string {
      return `${this.$route.params._id || ''}`
    },
    search: {
      get(): LocationQueryValue[] | string {
        const v = this.$route.query['search'] || ''

        return `${v}`.replace(/^\*|\*$/g, '')
      },
      set(v: string): void {
        this.$router.replace({
          query: {
            ...this.$route.query,
            search: v ? `${v}` : undefined,
          },
        })
      },
    },
    handlerSelectOptions(): CronConsoleHandler[] {
      const options = [...(this.cronHandlers || [])]
      const current = this.editForm.handler
      if (current && !options.some((option) => option.handler === current)) {
        options.unshift({
          handler: current,
          command: current.split('-').join(' '),
          label: current,
          arguments: [],
        })
      }
      return options
    },
    selectedHandlerDescriptor(): CronConsoleHandler | null {
      if (!this.editForm.handler) {
        return null
      }
      return this.handlerSelectOptions.find((option) => option.handler === this.editForm.handler) || null
    },
    selectedHandlerArguments(): CronConsoleHandlerArgument[] {
      return this.selectedHandlerDescriptor?.arguments || []
    },
    selectedHandlerArgumentNames(): string[] {
      return this.selectedHandlerArguments.map((argument) => argument.name)
    },
    unrecognizedArguments(): Array<{ name: string }> {
      const known = new Set(this.selectedHandlerArgumentNames)
      return Object.keys(this.editForm.arguments || {})
        .filter((name) => !known.has(name))
        .map((name) => ({ name }))
    },
    commandPreview(): string {
      return this.buildCommandPreview(this.editForm.handler, this.editForm.arguments)
    },
  },
  methods: {
    startLogsAutoRefresh(): void {
      if (this.logsAutoRefreshTimer || !this.logsDialog) {
        return
      }

      const refreshSeconds = Math.max(Math.round(this.logsAutoRefreshMs / 1000), 1)
      this.logsAutoRefreshCountdown = refreshSeconds
      this.logsAutoRefreshTimer = setInterval(() => {
        if (!this.logsDialog || !this.selectedCronName || this.logsLoading || this.logsLoadingMore) {
          return
        }

        if (this.logsAutoRefreshCountdown > 1) {
          this.logsAutoRefreshCountdown -= 1
          return
        }

        this.logsAutoRefreshCountdown = refreshSeconds
        void this.loadCronLogs()
      }, 1000)
    },
    stopLogsAutoRefresh(): void {
      if (!this.logsAutoRefreshTimer) {
        return
      }

      clearInterval(this.logsAutoRefreshTimer)
      this.logsAutoRefreshTimer = null
      this.logsAutoRefreshCountdown = Math.max(Math.round(this.logsAutoRefreshMs / 1000), 1)
    },
    resetLogsViewerState(): void {
      if (this.logsScrollDispose) {
        this.logsScrollDispose()
        this.logsScrollDispose = null
      }
      this.logsMonacoEditor = null
      this.logsLoadingMore = false
      this.logsLoading = false
      this.logsExists = false
      this.logsContent = ''
      this.logsFullyLoaded = false
      this.logsTail = this.logsTailStep
    },
    getNextExecution(cronTask: any): string {
      const nextExecution = cronTask?._job?.nextExecution
      if (nextExecution) {
        return this.$dayjs(nextExecution).format('DD/MM/YYYY HH:mm:ss')
      }
      return 'N/A'
    },
    formatCronOptions(options: unknown): Record<string, string | number | boolean> {
      if (!options || typeof options !== 'object' || Array.isArray(options)) {
        return {}
      }
      const formatted: Record<string, string | number | boolean> = {}
      for (const [key, value] of Object.entries(options as Record<string, unknown>)) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          formatted[key] = value
        }
      }
      return formatted
    },
    getHandlerDescriptor(handler: string): CronConsoleHandler | null {
      return this.handlerSelectOptions.find((option) => option.handler === handler) || null
    },
    syncArgumentsFromHandler(preserveExisting = true): void {
      const descriptor = this.getHandlerDescriptor(this.editForm.handler)
      const schemaArguments = descriptor?.arguments || []
      const sourceOptions = preserveExisting
        ? {
            ...this.formatCronOptions(this.originalTaskOptions),
            ...this.editForm.arguments,
          }
        : this.formatCronOptions(this.originalTaskOptions)
      const nextArguments: Record<string, string | number | boolean> = {}

      for (const argument of schemaArguments) {
        const existing = sourceOptions[argument.name]
        if (existing !== undefined && existing !== '') {
          nextArguments[argument.name] = existing
          continue
        }
        if (argument.default !== undefined) {
          nextArguments[argument.name] = argument.default
          continue
        }
        nextArguments[argument.name] = argument.type === 'boolean' ? false : ''
      }

      for (const [name, value] of Object.entries(sourceOptions)) {
        if (schemaArguments.some((argument) => argument.name === name)) {
          continue
        }
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          nextArguments[name] = value
        }
      }

      this.editForm.arguments = nextArguments
    },
    onHandlerChange(): void {
      this.syncArgumentsFromHandler(false)
    },
    buildCommandPreview(handler: string, argumentsMap: Record<string, string | number | boolean>): string {
      const descriptor = this.getHandlerDescriptor(handler)
      if (!descriptor?.command) {
        return ''
      }

      const parts = ['yarn', 'run', 'console', ...descriptor.command.split(/\s+/).filter(Boolean)]

      for (const argument of descriptor.arguments || []) {
        const value = argumentsMap[argument.name]
        if (value === '' || value === null || value === undefined) {
          continue
        }

        if (argument.positional) {
          parts.push(String(value))
          continue
        }

        const flag = argument.flag || `--${argument.name}`
        if (typeof value === 'boolean') {
          if (value) {
            parts.push(flag)
          }
          continue
        }

        parts.push(`${flag}=${String(value)}`)
      }

      return parts.join(' ')
    },
    buildOptionsFromArguments(): Record<string, string | number | boolean> | null | undefined {
      const descriptor = this.getHandlerDescriptor(this.editForm.handler)
      const schemaArguments = descriptor?.arguments || []
      const options: Record<string, string | number | boolean> = {}
      let hasErrors = false

      for (const [name] of Object.entries(this.editForm.arguments || {})) {
        if (schemaArguments.length && !schemaArguments.some((argument) => argument.name === name)) {
          this.editValidations[`arg:${name}`] = 'Argument non reconnu pour ce handler.'
          hasErrors = true
        }
      }

      for (const [name, rawValue] of Object.entries(this.editForm.arguments || {})) {
        const schema = schemaArguments.find((argument) => argument.name === name)
        if (rawValue === '' || rawValue === null || rawValue === undefined) {
          if (schema?.required) {
            this.editValidations[`arg:${name}`] = 'Ce paramètre est obligatoire.'
            hasErrors = true
          }
          continue
        }

        if (schema?.type === 'number') {
          const numericValue = Number(rawValue)
          if (!Number.isFinite(numericValue)) {
            this.editValidations[`arg:${name}`] = 'Valeur numérique attendue.'
            hasErrors = true
            continue
          }
          options[name] = numericValue
          continue
        }

        if (schema?.type === 'boolean') {
          options[name] = !!rawValue
          continue
        }

        options[name] = `${rawValue}`
      }

      if (hasErrors) {
        return null
      }

      return Object.keys(options).length ? options : undefined
    },
    resetEditValidations(): void {
      Object.keys(this.editValidations).forEach((key) => {
        delete this.editValidations[key]
      })
    },
    openEditDialog(cronTask: any): void {
      this.resetEditValidations()
      this.originalTaskOptions = this.formatCronOptions(cronTask?.options)
      this.editForm = {
        name: cronTask?.name || '',
        description: cronTask?.description || '',
        schedule: cronTask?.schedule || '',
        handler: cronTask?.handler || '',
        arguments: {},
      }
      this.syncArgumentsFromHandler(true)
      this.editDialog = true
    },
    async saveEditForm(): Promise<void> {
      const name = this.editForm.name
      if (!name) {
        return
      }

      this.resetEditValidations()

      if (!this.editForm.handler) {
        this.editValidations.handler = 'Le handler est obligatoire.'
        return
      }

      const options = this.buildOptionsFromArguments()
      if (options === null) {
        return
      }

      const payload: Record<string, unknown> = {
        description: this.editForm.description,
        schedule: this.editForm.schedule,
        handler: this.editForm.handler,
      }
      if (options !== undefined) {
        payload.options = options
      }

      this.editSaving = true
      try {
        await this.$http.patch(`/core/cron/${encodeURIComponent(name)}`, {
          body: payload,
        })
        this.$q.notify({
          message: `Tâche "${name}" mise à jour.`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        this.editDialog = false
        await this.refresh()
      } catch (error: any) {
        const message = error?.response?._data?.message || `Impossible de mettre à jour la tâche "${name}".`
        this.$q.notify({
          message,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.editSaving = false
      }
    },
    async openLogsModal(cronTask: any): Promise<void> {
      this.resetLogsViewerState()
      this.selectedCronName = cronTask?.name || ''
      this.logsDialog = true
      await this.loadCronLogs()
      this.startLogsAutoRefresh()
    },
    async toggleCronEnabled(cronTask: any): Promise<void> {
      const name = cronTask?.name
      if (!name) {
        return
      }

      const enabled = !cronTask?.enabled
      this.cronToggleLoading[name] = true
      try {
        await this.$http.patch(`/core/cron/${encodeURIComponent(name)}/enabled`, {
          body: { enabled },
        })
        this.$q.notify({
          message: enabled ? `Tâche "${name}" activée.` : `Tâche "${name}" désactivée.`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        await this.refresh()
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible de modifier l'état de la tâche "${name}".`,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.cronToggleLoading[name] = false
      }
    },
    async runCronImmediately(cronTask: any): Promise<void> {
      const name = cronTask?.name
      if (!name) {
        return
      }

      this.cronRunLoading[name] = true
      try {
        await this.$http.post(`/core/cron/${encodeURIComponent(name)}/run-immediately`)
        this.$q.notify({
          message: `Exécution immédiate lancée pour "${name}".`,
          color: 'positive',
          position: 'bottom-center',
          icon: 'mdi-play-circle-outline',
        })
        await this.refresh()
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible de lancer immédiatement "${name}".`,
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.cronRunLoading[name] = false
      }
    },
    async runSelectedCronImmediately(): Promise<void> {
      if (!this.selectedCronName) {
        return
      }

      this.logsRunLoading = true
      try {
        await this.$http.post(`/core/cron/${encodeURIComponent(this.selectedCronName)}/run-immediately`)
        this.$q.notify({
          message: `Exécution immédiate lancée pour "${this.selectedCronName}".`,
          color: 'positive',
          position: 'bottom',
          icon: 'mdi-play-circle-outline',
        })
      } catch (error: any) {
        this.$q.notify({
          message: error?.response?._data?.message || `Impossible de lancer immédiatement "${this.selectedCronName}".`,
          color: 'negative',
          position: 'bottom',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.logsRunLoading = false
      }
    },
    async loadCronLogs(): Promise<void> {
      if (!this.selectedCronName) {
        return
      }

      this.logsLoading = true
      try {
        const response = await this.$http.get(`/core/cron/${encodeURIComponent(this.selectedCronName)}/logs`, {
          query: {
            tail: this.logsTail,
          },
        })
        this.logsContent = response?._data?.data?.content || ''
        this.logsExists = !!response?._data?.data?.exists
        const lineCount = this.logsContent ? this.logsContent.split('\n').length : 0
        this.logsFullyLoaded = this.logsTail >= this.logsTailMax || lineCount < this.logsTail
      } catch (error: any) {
        this.logsContent = ''
        this.logsExists = false
        this.logsFullyLoaded = true
        this.$q.notify({
          message: error?.response?._data?.message || 'Impossible de charger les logs de la tâche cron (timeout ou erreur réseau).',
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        this.logsLoading = false
        if (this.logsDialog && this.selectedCronName) {
          this.logsAutoRefreshCountdown = Math.max(Math.round(this.logsAutoRefreshMs / 1000), 1)
        }
      }
    },
    onLogsEditorLoad(editor: any): void {
      this.logsMonacoEditor = editor
      if (this.logsScrollDispose) {
        this.logsScrollDispose()
        this.logsScrollDispose = null
      }

      const model = editor.getModel()
      const lineCount = model?.getLineCount() || 1
      editor.revealLineNearTop(lineCount)
      const disposable = editor.onDidScrollChange(async () => {
        const isAtTop = editor.getScrollTop() <= 0
        if (!isAtTop || this.logsLoading || this.logsLoadingMore || this.logsFullyLoaded || !this.logsExists) {
          return
        }

        const nextTail = Math.min(this.logsTail + this.logsTailStep, this.logsTailMax)
        if (nextTail <= this.logsTail) {
          this.logsFullyLoaded = true
          return
        }

        this.logsLoadingMore = true
        this.logsTail = nextTail
        const previousModel = editor.getModel()
        const previousLineCount = previousModel?.getLineCount() || 1
        const anchorLine = editor.getVisibleRanges()?.[0]?.startLineNumber || 1
        try {
          await this.loadCronLogs()
          this.$nextTick(() => {
            const updatedModel = editor.getModel()
            const updatedLineCount = updatedModel?.getLineCount() || previousLineCount
            const addedLines = Math.max(updatedLineCount - previousLineCount, 0)
            const nextAnchorLine = Math.min(anchorLine + addedLines, updatedLineCount)
            editor.revealLineNearTop(nextAnchorLine)
          })
        } finally {
          this.logsLoadingMore = false
        }
      })
      this.logsScrollDispose = () => disposable.dispose()
    },
  },
})
</script>
