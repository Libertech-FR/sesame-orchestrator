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
          span.q-ml-sm.text-caption(v-if='logsLastReceivedAt')
            | · {{ logsLastReceivedAtLabel }}
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
        q-btn(flat round dense icon='mdi-refresh' :loading='logsLoading' @click='requestCronLogsSnapshot')
          q-tooltip.text-body2(anchor='top middle' self='bottom middle') Actualiser les logs
        q-btn(flat round dense icon='mdi-close' v-close-popup)
          q-tooltip.text-body2(anchor='top middle' self='bottom middle') Fermer
      q-separator
      q-card-section.col.q-pa-none.cron-logs-panel(ref='logsContainer')
        q-inner-loading(:showing='logsLoading')
        div.text-center.cron-logs-empty(v-if='!logsLoading && !logsExists').text-grey-7 Aucun fichier de log trouvé pour cette tâche.
        pre.cron-logs-viewer(
          v-show='logsExists'
          ref='logsViewer'
          @scroll='onLogsViewerScroll'
        )
          code.hljs.language-bash(v-if='logsHighlightedHtml' v-html='logsHighlightedHtml')
          code.hljs.language-bash(v-else) {{ logsContent || 'Aucun contenu de log.' }}
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { reactive, ref } from 'vue'
import { attachSocketIoDebug } from '~/composables/useSocketIoDebug'
import { io, type Socket } from 'socket.io-client'
import { NewTargetId } from '~/constants/variables'

type CronLogsEvent =
  | { type: 'snapshot'; exists: boolean; content: string; updatedAt: string | null }
  | { type: 'append'; content: string }
  | { type: 'resync' }

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
      logsContent: '',
      logsHighlightedHtml: '',
      logsHighlightTimer: null as ReturnType<typeof setTimeout> | null,
      logsLoadInFlight: false,
      logsLastScrollTop: 0,
      logsSnapshotTimeout: null as ReturnType<typeof setTimeout> | null,
      logsSnapshotResolver: null as (() => void) | null,
      logsHasScrolledDown: false,
      logsFollowTail: true,
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
    const { highlightShellLogs } = useShellSyntaxHighlight()

    const paginationOptions = useHttpPaginationOptions()
    const logsDialog = ref(false)
    const selectedCronName = ref('')
    const logsLoading = ref(false)
    const logsTail = ref(250)
    const logsTailStep = 250
    const logsTailMax = 5_000
    const logsFullyLoaded = ref(false)
    const logsExists = ref(false)
    const logsLoadingMore = ref(false)
    const logsRunLoading = ref(false)
    const logsSocket = ref<Socket | null>(null)
    const logsSocketConnected = ref(false)
    const logsLastReceivedAt = ref<string | null>(null)
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
      highlightShellLogs,
      logsDialog,
      selectedCronName,
      logsLoading,
      logsTail,
      logsTailStep,
      logsTailMax,
      logsFullyLoaded,
      logsExists,
      logsLoadingMore,
      logsRunLoading,
      logsSocket,
      logsSocketConnected,
      logsLastReceivedAt,
      cronToggleLoading,
      cronRunLoading,
      editDialog,
      editSaving,
      editValidations,
      editForm,
      originalTaskOptions,
      cronHandlers,
    }
  },
  watch: {
    logsDialog(isOpen: boolean): void {
      if (isOpen) {
        this.connectCronLogsSocket()
        return
      }

      this.disconnectCronLogsSocket()
      this.resetLogsViewerState()
    },
  },
  beforeUnmount(): void {
    this.disconnectCronLogsSocket()
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
    logsLastReceivedAtLabel(): string {
      if (!this.logsLastReceivedAt) {
        return ''
      }
      return `Mis à jour le ${this.$dayjs(this.logsLastReceivedAt).format('DD/MM/YYYY HH:mm:ss')}`
    },
  },
  methods: {
    touchLogsLastReceived(): void {
      this.logsLastReceivedAt = new Date().toISOString()
    },
    getLogsViewerElement(): HTMLElement | null {
      const viewer = this.$refs.logsViewer
      return viewer instanceof HTMLElement ? viewer : null
    },
    isLogsViewerNearBottom(threshold = 48): boolean {
      const viewer = this.getLogsViewerElement()
      if (!viewer) {
        return true
      }
      return viewer.scrollTop + viewer.clientHeight >= viewer.scrollHeight - threshold
    },
    scrollLogsViewerToBottom(): void {
      const viewer = this.getLogsViewerElement()
      if (!viewer) {
        return
      }
      const scroll = () => {
        viewer.scrollTop = viewer.scrollHeight
        this.logsLastScrollTop = viewer.scrollTop
      }
      scroll()
      requestAnimationFrame(scroll)
    },
    clearLogsHighlightTimer(): void {
      if (this.logsHighlightTimer) {
        clearTimeout(this.logsHighlightTimer)
        this.logsHighlightTimer = null
      }
    },
    scheduleLogsHighlight(immediate = false, scrollToBottom = false): void {
      this.clearLogsHighlightTimer()
      const apply = () => {
        this.refreshLogsHighlight()
        if (!scrollToBottom) {
          return
        }
        this.$nextTick(() => {
          this.scrollLogsViewerToBottom()
        })
      }
      if (immediate) {
        apply()
        return
      }
      this.logsHighlightTimer = window.setTimeout(() => {
        this.logsHighlightTimer = null
        apply()
      }, 200)
    },
    refreshLogsHighlight(): void {
      const content = this.logsContent || ''
      if (!content) {
        this.logsHighlightedHtml = ''
        return
      }
      try {
        this.logsHighlightedHtml = this.highlightShellLogs(content)
      } catch {
        this.logsHighlightedHtml = ''
      }
    },
    applyLogsContent(content: string, scrollToBottom = false): void {
      this.logsContent = content || ''
      this.scheduleLogsHighlight(true, scrollToBottom)
    },
    appendLogsContent(chunk: string, scrollToBottom = false): void {
      this.logsContent = `${this.logsContent || ''}${chunk}`
      this.scheduleLogsHighlight(scrollToBottom, scrollToBottom)
    },
    clearLogsSnapshotTimeout(): void {
      if (this.logsSnapshotTimeout) {
        clearTimeout(this.logsSnapshotTimeout)
        this.logsSnapshotTimeout = null
      }
    },
    finishCronLogsSnapshotRequest(): void {
      this.clearLogsSnapshotTimeout()
      this.logsLoading = false
      this.logsLoadingMore = false
      this.logsLoadInFlight = false
      const resolver = this.logsSnapshotResolver
      this.logsSnapshotResolver = null
      resolver?.()
    },
    onCronLogsSnapshotTimeout(): void {
      this.logsSnapshotTimeout = null
      if (!this.logsLoadInFlight) {
        return
      }

      void this.loadCronLogsViaHttp(true).finally(() => {
        this.finishCronLogsSnapshotRequest()
      })
    },
    connectCronLogsSocket(): void {
      if (!this.logsDialog || !this.selectedCronName) {
        return
      }

      const auth = useAuth()
      const id = auth.user?._id
      const key = auth.user?.sseToken
      if (!id || !key) {
        return
      }

      this.disconnectCronLogsSocket()
      this.logsHasScrolledDown = false
      this.logsFollowTail = true
      this.logsLoading = true

      this.logsSocket = io('/core/cron', {
        path: '/socket.io',
        query: { id: String(id), key: String(key) },
        transports: ['polling'],
        reconnectionAttempts: 10,
      })
      attachSocketIoDebug(this.logsSocket, '/core/cron')

      this.logsSocket.on('connect', () => {
        this.logsSocketConnected = true
        this.logsSocket?.emit('subscribe', {
          taskName: this.selectedCronName,
          tail: this.logsTail,
        })
      })

      this.logsSocket.on('disconnect', () => {
        this.logsSocketConnected = false
      })

      this.logsSocket.on('connect_error', () => {
        this.logsSocketConnected = false
        this.logsLoading = false
      })

      this.logsSocket.on('logs', (payload: CronLogsEvent) => {
        this.handleCronLogsEvent(payload)
      })
    },
    disconnectCronLogsSocket(): void {
      if (this.logsSocket) {
        this.logsSocket.emit('unsubscribe')
        this.logsSocket.removeAllListeners()
        this.logsSocket.disconnect()
        this.logsSocket = null
      }
      this.logsSocketConnected = false
    },
    handleCronLogsEvent(payload: CronLogsEvent): void {
      if (!payload || typeof payload !== 'object') {
        return
      }

      if (payload.type === 'snapshot') {
        this.logsExists = payload.exists
        if (!this.logsLoadingMore) {
          this.logsHasScrolledDown = false
          this.logsFollowTail = true
        }
        this.applyLogsContent(payload.content || '', this.logsFollowTail && !this.logsLoadingMore)
        this.touchLogsLastReceived()
        const lineCount = this.logsContent ? this.logsContent.split('\n').length : 0
        this.logsFullyLoaded = this.logsTail >= this.logsTailMax || lineCount < this.logsTail
        this.finishCronLogsSnapshotRequest()
        return
      }

      if (payload.type === 'append' && payload.content) {
        this.appendLogsContent(payload.content, this.logsFollowTail)
        this.logsExists = true
        this.touchLogsLastReceived()
        return
      }

      if (payload.type === 'resync') {
        return
      }
    },
    resetLogsViewerState(): void {
      this.logsLoadingMore = false
      this.logsLoading = false
      this.logsExists = false
      this.logsContent = ''
      this.logsHighlightedHtml = ''
      this.clearLogsHighlightTimer()
      this.logsFullyLoaded = false
      this.logsTail = this.logsTailStep
      this.logsLastReceivedAt = null
      this.logsLoadInFlight = false
      this.logsLastScrollTop = 0
      this.logsHasScrolledDown = false
      this.logsFollowTail = true
      this.clearLogsSnapshotTimeout()
      const resolver = this.logsSnapshotResolver
      this.logsSnapshotResolver = null
      resolver?.()
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
          position: 'bottom',
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
    requestCronLogsSnapshot(): Promise<void> {
      if (!this.selectedCronName || this.logsLoadInFlight) {
        return Promise.resolve()
      }

      if (!this.logsLoadingMore) {
        this.logsTail = this.logsTailStep
        this.logsFullyLoaded = false
        this.logsHasScrolledDown = false
      }

      const socket = this.logsSocket
      if (socket?.connected) {
        return new Promise((resolve) => {
          this.logsLoadInFlight = true
          this.logsSnapshotResolver = resolve
          this.logsLoading = true

          socket.emit('resync', {
            taskName: this.selectedCronName,
            tail: this.logsTail,
          })

          this.clearLogsSnapshotTimeout()
          this.logsSnapshotTimeout = window.setTimeout(() => {
            this.onCronLogsSnapshotTimeout()
          }, 10_000)
        })
      }

      return this.loadCronLogsViaHttp()
    },
    async loadCronLogsViaHttp(isFallback = false): Promise<void> {
      if (!this.selectedCronName) {
        return
      }

      if (this.logsLoadInFlight && !isFallback) {
        return
      }

      if (!isFallback) {
        this.logsLoadInFlight = true
        this.logsLoading = true
      }
      try {
        const data = await this.$http.$get(`/core/cron/${encodeURIComponent(this.selectedCronName)}/logs`, {
          query: {
            tail: this.logsTail,
          },
        }) as { data?: { content?: string; exists?: boolean } }
        const content = data?.data?.content || ''
        this.logsExists = !!data?.data?.exists
        this.logsHasScrolledDown = false
        this.applyLogsContent(content, this.logsFollowTail && !this.logsLoadingMore)
        this.touchLogsLastReceived()
        const lineCount = this.logsContent ? this.logsContent.split('\n').length : 0
        this.logsFullyLoaded = this.logsTail >= this.logsTailMax || lineCount < this.logsTail
      } catch (error: any) {
        this.logsContent = ''
        this.logsHighlightedHtml = ''
        this.logsExists = false
        this.logsFullyLoaded = true
        this.applyLogsContent('')
        this.$q.notify({
          message: error?.response?._data?.message || 'Impossible de charger les logs de la tâche cron (timeout ou erreur réseau).',
          color: 'negative',
          position: 'top-right',
          icon: 'mdi-alert-circle-outline',
        })
      } finally {
        if (!isFallback) {
          this.logsLoading = false
          this.logsLoadingMore = false
          this.logsLoadInFlight = false
        }
      }
    },
    onLogsViewerScroll(): void {
      const viewer = this.getLogsViewerElement()
      if (!viewer) {
        return
      }

      const scrollTop = viewer.scrollTop
      this.logsFollowTail = this.isLogsViewerNearBottom()
      if (scrollTop > 100) {
        this.logsHasScrolledDown = true
      }
      this.logsLastScrollTop = scrollTop

      if (
        scrollTop > 0
        || !this.logsHasScrolledDown
        || this.logsLoadInFlight
        || this.logsLoading
        || this.logsLoadingMore
        || this.logsFullyLoaded
        || !this.logsExists
      ) {
        return
      }

      const nextTail = Math.min(this.logsTail + this.logsTailStep, this.logsTailMax)
      if (nextTail <= this.logsTail) {
        this.logsFullyLoaded = true
        return
      }

      const previousScrollHeight = viewer.scrollHeight
      this.logsLoadingMore = true
      this.logsTail = nextTail
      void this.requestCronLogsSnapshot().finally(() => {
        this.logsLoadingMore = false
        this.$nextTick(() => {
          const updatedViewer = this.getLogsViewerElement()
          if (!updatedViewer) {
            return
          }
          const addedHeight = updatedViewer.scrollHeight - previousScrollHeight
          updatedViewer.scrollTop = Math.max(addedHeight, 0)
          this.logsLastScrollTop = updatedViewer.scrollTop
        })
      })
    },
  },
})
</script>

<style lang="sass" scoped>
.cron-logs-panel
  min-height: 0
  overflow: hidden
  position: relative

.cron-logs-empty
  padding: 24px

.cron-logs-viewer
  margin: 0
  padding: 8px 12px
  height: 100%
  overflow: auto
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace
  font-size: 12px
  line-height: 1.4
  white-space: pre
  word-wrap: normal
  background: #282c34
  color: #abb2bf
  box-sizing: border-box

  :deep(code.hljs)
    display: block
    padding: 0
    background: transparent
    font-family: inherit
    font-size: inherit
    line-height: inherit
    white-space: pre
    color: #abb2bf

    .hljs-comment,
    .hljs-quote
      color: #5c6370
      font-style: italic

    .hljs-doctag,
    .hljs-formula,
    .hljs-keyword
      color: #c678dd

    .hljs-deletion,
    .hljs-name,
    .hljs-section,
    .hljs-selector-tag,
    .hljs-subst
      color: #e06c75

    .hljs-literal
      color: #56b6c2

    .hljs-addition,
    .hljs-attribute,
    .hljs-meta .hljs-string,
    .hljs-regexp,
    .hljs-string
      color: #98c379

    .hljs-attr,
    .hljs-number,
    .hljs-selector-attr,
    .hljs-selector-class,
    .hljs-selector-pseudo,
    .hljs-template-variable,
    .hljs-type,
    .hljs-variable
      color: #d19a66

    .hljs-bullet,
    .hljs-link,
    .hljs-meta,
    .hljs-selector-id,
    .hljs-symbol,
    .hljs-title
      color: #61aeee

    .hljs-built_in,
    .hljs-class .hljs-title,
    .hljs-title.class_
      color: #e6c07b
</style>
