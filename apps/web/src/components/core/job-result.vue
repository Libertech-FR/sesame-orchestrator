<template lang="pug">
.job-result.q-gutter-y-md
  template(v-if="!hasResult")
    .text-grey.text-italic.q-pa-md Aucun résultat disponible pour cette tâche.

  template(v-else)
    //- Synthèse globale
    .row.items-center.q-gutter-sm
      q-chip(:color="statusColor(globalStatus)" text-color="white" :icon="statusIcon(globalStatus)" square)
        | {{ statusLabel(globalStatus) }}
      q-chip(v-if="result.jobName" outline square icon="mdi-cog-outline") {{ result.jobName }}
      q-chip(v-if="result.jobId" outline square icon="mdi-identifier") {{ result.jobId }}
      q-chip(v-if="typeof result.status === 'number'" outline square icon="mdi-numeric") Code : {{ result.status }}

    //- Erreur globale (échec côté file d'attente / worker)
    q-banner.bg-negative.text-white(v-if="globalError" rounded dense)
      template(#avatar)
        q-icon(name="mdi-alert-circle")
      .text-weight-bold Erreur
      pre.job-result__pre.q-mb-none(v-text="formatText(globalError)")

    //- Résultat par backend
    template(v-if="backends.length")
      q-card(v-for="backend in backends" :key="backend.name" flat bordered)
        q-card-section.row.items-center.q-py-sm
          q-icon.q-mr-sm(:name="statusIcon(backend.status)" :color="statusColor(backend.status)" size="sm")
          .text-subtitle1.text-weight-medium {{ backend.name }}
          q-space
          q-chip(:color="statusColor(backend.status)" text-color="white" dense square)
            | {{ statusLabel(backend.status) }}
            template(v-if="typeof backend.status === 'number'") &nbsp;({{ backend.status }})
        q-separator
        q-card-section(v-for="(entry, i) in backend.entries" :key="i")
          .text-overline(:class="entry.kind === 'error' ? 'text-negative' : 'text-primary'")
            | {{ entry.kind === 'error' ? 'Erreur' : 'Sortie' }}
            template(v-if="typeof entry.status === 'number'") &nbsp;- code {{ entry.status }}
          pre.job-result__pre(v-if="entry.message" :class="entry.kind === 'error' ? 'text-negative' : ''" v-text="formatText(entry.message)")
          template(v-if="entry.data !== undefined && entry.data !== null")
            q-markup-table(v-if="isFlatObject(entry.data)" flat bordered dense separator="cell")
              tbody
                tr(v-for="(value, key) in entry.data" :key="key")
                  td.text-weight-medium(style="width: 30%") {{ key }}
                  td.job-result__cell(v-text="formatValue(value)")
            pre.job-result__pre(v-else v-text="formatText(entry.data)")
          .text-grey.text-italic(v-if="!entry.message && (entry.data === undefined || entry.data === null)") Aucun détail.

    //- Autres informations (format non reconnu ou champs supplémentaires)
    q-card(v-if="extras" flat bordered)
      q-card-section.q-py-sm
        .text-subtitle2 Autres informations
      q-separator
      q-markup-table(flat dense separator="cell")
        tbody
          tr(v-for="(value, key) in extras" :key="key")
            td.text-weight-medium(style="width: 30%") {{ key }}
            td.job-result__cell
              pre.job-result__pre.q-mb-none(v-text="formatValue(value)")
</template>

<script lang="ts">
type ResultInfo = { status?: number; message?: unknown; data?: unknown }
type BackendEntry = { kind: 'output' | 'error'; status?: number; message?: unknown; data?: unknown }
type BackendView = { name: string; status?: number; entries: BackendEntry[] }
type RawBackend = { backend?: string; status?: number; output?: ResultInfo | string; error?: ResultInfo | string; [key: string]: unknown }
type JobResult = { jobName?: string; jobId?: string; status?: number; data?: unknown; error?: unknown; [key: string]: unknown }

const KNOWN_KEYS = ['jobName', 'jobId', 'status', 'data', 'error', 'options']

export default defineNuxtComponent({
  name: 'CoreJobResultComponent',
  props: {
    result: {
      type: Object as PropType<JobResult | null>,
      default: null,
    },
    state: {
      type: Number,
      default: undefined,
    },
  },
  computed: {
    hasResult(): boolean {
      return !!this.result && typeof this.result === 'object' && Object.keys(this.result).length > 0
    },
    globalError(): unknown {
      const error = this.result?.error
      if (!error) return null
      return typeof error === 'object' && 'message' in error ? (error as { message: unknown }).message : error
    },
    globalStatus(): number | undefined {
      if (typeof this.result?.status === 'number') return this.result.status
      if (this.globalError) return 1
      if (this.state === 9) return 0
      if (this.state === -1) return 1
      return undefined
    },
    backends(): BackendView[] {
      const data = this.result?.data
      if (!data || typeof data !== 'object') return []

      // Normalisation : tableau de résultats, résultat unique, ou objet indexé par backend
      let items: [string, unknown][]
      if (Array.isArray(data)) {
        items = data.map((value, i) => [String((value as RawBackend)?.backend ?? `#${i + 1}`), value])
      } else if (this.isBackendResult(data)) {
        items = [[String((data as RawBackend).backend ?? 'Résultat'), data]]
      } else {
        items = Object.entries(data as Record<string, unknown>)
      }

      return items.map(([name, raw]) => {
        if (!raw || typeof raw !== 'object') {
          return { name, entries: [{ kind: 'output' as const, message: raw }] }
        }

        const value = raw as RawBackend
        const entries: BackendEntry[] = []
        for (const kind of ['output', 'error'] as const) {
          const info = value[kind]
          if (info === undefined || info === null) continue
          if (typeof info === 'object') {
            entries.push({ kind, status: info.status, message: info.message, data: info.data })
          } else {
            entries.push({ kind, message: info })
          }
        }

        if (!entries.length) {
          const rest = Object.fromEntries(Object.entries(value).filter(([k]) => !['backend', 'status'].includes(k)))
          if (Object.keys(rest).length) entries.push({ kind: 'output', data: rest })
        }

        const status = typeof value.status === 'number' ? value.status : entries.find((e) => typeof e.status === 'number')?.status
        return { name: value.backend || name, status, entries }
      })
    },
    extras(): Record<string, unknown> | null {
      if (!this.hasResult) return null
      const extras = Object.fromEntries(Object.entries(this.result as Record<string, unknown>).filter(([k]) => !KNOWN_KEYS.includes(k)))
      if (this.result?.data !== undefined && !this.backends.length) {
        extras.data = this.result.data
      }
      return Object.keys(extras).length ? extras : null
    },
  },
  methods: {
    isBackendResult(value: unknown): boolean {
      return !!value && typeof value === 'object' && ('output' in value || 'error' in value)
    },
    statusColor(status?: number): string {
      if (status === undefined) return 'grey'
      return status === 0 ? 'positive' : 'negative'
    },
    statusIcon(status?: number): string {
      if (status === undefined) return 'mdi-help-circle-outline'
      return status === 0 ? 'mdi-check-circle' : 'mdi-close-circle'
    },
    statusLabel(status?: number): string {
      if (status === undefined) return 'Inconnu'
      return status === 0 ? 'Succès' : 'Échec'
    },
    isFlatObject(value: unknown): value is Record<string, unknown> {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false
      return Object.values(value).every((v) => v === null || typeof v !== 'object')
    },
    formatValue(value: unknown): string {
      if (value === null || value === undefined) return '-'
      if (typeof value === 'object') return this.formatText(value)
      return typeof value === 'string' ? this.unescape(value) : String(value)
    },
    unescape(value: string): string {
      return value.replace(/\\r\\n|\\n/g, '\n').replace(/\\t/g, '\t')
    },
    formatText(value: unknown): string {
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
          try {
            return JSON.stringify(JSON.parse(trimmed), null, 2)
          } catch {
            return this.unescape(value)
          }
        }
        return this.unescape(value)
      }
      try {
        return JSON.stringify(value, null, 2)
      } catch {
        return typeof value === 'string' ? this.unescape(value) : String(value)
      }
    },
  },
})
</script>

<style scoped>
.job-result__pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-family: monospace;
  font-size: 0.85em;
  margin: 4px 0 0;
}

.job-result__cell {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
