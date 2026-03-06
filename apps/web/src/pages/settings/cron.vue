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
          icon='mdi-file-document-outline'
          size='sm'
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
  q-dialog(v-model='logsDialog' maximized)
    q-card.fit.column.no-wrap(style='overflow: hidden;')
      q-toolbar.bg-info.text-white(bordered dense style='height: 28px; line-height: 28px;')
        q-toolbar-title Logs de la tâche "{{ selectedCronName }}"
        q-space
        q-btn(flat round dense icon='mdi-refresh' :loading='logsLoading' @click='loadCronLogs')
        q-btn(flat round dense icon='mdi-close' v-close-popup)
      q-separator
      q-card-section.col.q-pa-none(ref='logsContainer' style='min-height: 0; overflow: auto;')
        q-inner-loading(:showing='logsLoading')
        div.text-center(v-if='!logsLoading && !logsExists').text-grey-7 Aucun fichier de log trouvé pour cette tâche.
        client-only(v-if='logsExists')
          MonacoEditor.fit(
            ref='logsMonacoEditor'
            :model-value="logsContent || 'Aucun contenu de log.'"
            :options='logsMonacoOptions'
            lang='shell'
            @load='onLogsEditorLoad'
          )
</template>

<script lang="ts">
import type { LocationQueryValue } from 'vue-router'
import { computed, ref } from 'vue'
import { NewTargetId } from '~/constants/variables'

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
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()
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
      logsMonacoOptions,
    }
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
  },
  methods: {
    getNextExecution(cronTask: any): string {
      const nextExecution = cronTask?._job?.nextExecution
      if (nextExecution) {
        return this.$dayjs(nextExecution).format('DD/MM/YYYY HH:mm:ss')
      }
      return 'N/A'
    },
    async openLogsModal(cronTask: any): Promise<void> {
      this.selectedCronName = cronTask?.name || ''
      this.logsTail = this.logsTailStep
      this.logsFullyLoaded = false
      this.logsDialog = true
      await this.loadCronLogs()
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
      }
    },
    onLogsEditorLoad(editor: any): void {
      this.logsMonacoEditor = editor
      const model = editor.getModel()
      const lineCount = model?.getLineCount() || 1
      editor.revealLineNearTop(lineCount)
      editor.onDidScrollChange(async () => {
        const isAtTop = editor.getScrollTop() <= 0
        if (!isAtTop || this.logsLoading || this.logsFullyLoaded || !this.logsExists) {
          return
        }

        const nextTail = Math.min(this.logsTail + this.logsTailStep, this.logsTailMax)
        if (nextTail <= this.logsTail) {
          this.logsFullyLoaded = true
          return
        }

        this.logsTail = nextTail
        const previousModel = editor.getModel()
        const previousLineCount = previousModel?.getLineCount() || 1
        const anchorLine = editor.getVisibleRanges()?.[0]?.startLineNumber || 1
        await this.loadCronLogs()
        this.$nextTick(() => {
          const updatedModel = editor.getModel()
          const updatedLineCount = updatedModel?.getLineCount() || previousLineCount
          const addedLines = Math.max(updatedLineCount - previousLineCount, 0)
          const nextAnchorLine = Math.min(anchorLine + addedLines, updatedLineCount)
          editor.revealLineNearTop(nextAnchorLine)
        })
      })
    },
  },
})
</script>
