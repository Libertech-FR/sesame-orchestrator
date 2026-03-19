<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md
    .row.items-center.q-col-gutter-sm.q-mb-md
      .col
        h5.q-ma-none Santé applicative
        .text-caption.text-grey-7 Vue en temps réel des indicateurs backend
      .col-auto.row.items-center.justify-end
        .text-caption.text-grey-7 Dernière mise à jour: {{ $dayjs(lastRefreshTime).format('DD/MM/YYYY HH:mm:ss') }} (mise à jour automatique dans {{ secondsBeforeRefresh }}s)
        q-btn.q-ml-sm(icon='mdi-refresh' :loading='pending' @click='refreshHealth' flat dense size='sm')
          q-tooltip.text-body2(anchor="top middle" self="bottom middle") Actualiser les données

    .row.q-col-gutter-md.q-mb-md(v-if='statsCards.length')
      .col-12.col-sm-6.col-lg-3(v-for='card in statsCards' :key='card.key')
        q-card.fit(flat bordered)
          q-card-section.row.items-center.no-wrap
            q-avatar(:color='card.color' text-color='white' size='42px' :icon='card.icon')
            .q-ml-md
              .text-caption.text-grey-7 {{ card.label }}
              .text-h6.text-weight-bold {{ card.value }}
            q-tooltip.bg-grey-10.text-white.text-body2(v-if='card.tooltipMeaning' anchor='top middle' self='bottom middle' :offset='[0, 8]' style='max-width: 320px')
              .column.q-gutter-xs
                .row.items-center.no-wrap
                  q-icon(:name='card.icon' :color='card.color' size='16px')
                  .text-subtitle2.q-ml-xs {{ card.label }}
                q-badge(v-if='card.tooltipTag' :color='card.color' text-color='white' :label='card.tooltipTag')
                .text-caption {{ card.tooltipMeaning }}
                .text-caption.text-blue-2(v-if='card.tooltipHow')
                  strong Lecture:
                  span.q-ml-xs {{ card.tooltipHow }}

    q-card.q-mb-md(v-if='historySnapshots.length' flat bordered)
      q-card-section.row.items-center.justify-between
        .row.items-center.no-wrap
          q-icon(name='mdi-chart-box-multiple-outline' size='20px' class='q-mr-sm' color='primary')
          .text-subtitle2 Tendances detaillees (5 minutes)
        .text-caption.text-grey-7 Vue multi-indicateurs
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12
            .text-caption.text-grey-7.q-mb-xs Ressources systeme (CPU / Heap / RSS)
            client-only
              VChart(
                :option='resourcesTrendChartOptions'
                autoresize
                style='height: 260px; width: 100%;'
              )

    .row.items-center.q-col-gutter-sm.q-mb-md
      .col
        .text-subtitle1.text-weight-bold Vue détaillée des services
        .text-caption.text-grey-7 État des dépendances, ressources système et contrôles prévus
    q-banner.q-mb-md(
      v-if='errorMessage'
      rounded
      dense
      class='bg-negative text-white'
      inline-actions
    )
      span {{ errorMessage }}

    q-card.q-mb-md(v-if='healthPayload' flat bordered)
      q-card-section.row.items-center.justify-between
        .row.items-center.no-wrap
          q-icon(name='mdi-shield-check-outline' size='22px' class='q-mr-sm' :color='statusColor(healthPayload.status)')
          .text-subtitle1 Statut global
        .row.items-center.no-wrap
          q-chip(
            square
            :color="statusColor(healthPayload.status)"
            text-color='white'
            :label="(healthPayload.status || 'unknown').toUpperCase()"
          )
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12.col-md-4
            .text-caption.text-grey-7 Indicateurs disponibles
            .text-subtitle1.text-weight-bold {{ indicatorCards.length }}
          .col-12.col-md-4
            .text-caption.text-grey-7 Services opérationnels
            .text-subtitle1.text-weight-bold.text-positive {{ upIndicators }}
          .col-12.col-md-4
            .text-caption.text-grey-7 Services en anomalie
            .text-subtitle1.text-weight-bold.text-negative {{ downIndicators }}

    .row.q-col-gutter-md(v-if='indicatorCards.length')
      .col-12.col-md-6.col-lg-4(v-for='card in indicatorCards' :key='card.key')
        q-card.fit(flat bordered)
          q-card-section.row.items-center.justify-between
            .row.items-center.no-wrap
              q-avatar(size='30px' :color='statusColor(card.status)' text-color='white' :icon='serviceIcon(card.key)')
              .text-subtitle2.q-ml-sm {{ displayServiceLabel(card.key) }}
            .row.items-center.no-wrap
              q-chip(
                dense
                square
                :color='statusColor(card.status)'
                text-color='white'
                :label='card.status.toUpperCase()'
              )
          q-separator
          q-card-section.q-py-sm(v-if='serviceStatusSeries(card.key).length > 1')
            .text-caption.text-grey-7.q-mb-xs Tendance de disponibilite
            client-only
              VChart(
                :option='miniTrendChartOptions(serviceStatusSeries(card.key), card.status === "down" ? "#E5533D" : "#4CAF7A")'
                autoresize
                style='height: 42px; width: 100%;'
              )
          q-separator
          q-card-section.q-pa-none
            .text-caption.text-grey-7.q-pa-md(v-if='!card.metrics.length') Aucun détail de métrique.
            q-table(
              v-else
              dense
              flat
              :rows='serviceMetricRows(card)'
              :columns='serviceMetricColumns'
              row-key='id'
              hide-pagination
              :rows-per-page-options='[0]'
            )
              template(v-slot:body-cell-value='props')
                q-td(:props='props')
                  span.text-weight-medium {{ props.row.value }}
              template(v-slot:body-cell-trend='props')
                q-td(:props='props')
                  client-only
                    VChart(
                      :option='miniTrendChartOptions(metricSeries(props.row.trendKey))'
                      autoresize
                      style='height: 30px; width: 90px;'
                    )

    .row.q-col-gutter-md.q-mt-sm(v-if='systemCards.length')
      .col-12.col-md-6(v-for='card in systemCards' :key='card.key')
        q-card(flat bordered)
          q-card-section.row.items-center.no-wrap
            q-avatar(size='30px' color='grey-8' text-color='white' :icon='systemIcon(card.key)')
            .text-subtitle2.q-ml-sm {{ card.label }}
          q-separator
          q-card-section.q-pa-none
            q-table(
              dense
              flat
              :rows='systemMetricRows(card)'
              :columns='systemMetricColumns'
              row-key='id'
              hide-pagination
              :rows-per-page-options='[0]'
            )
              template(v-slot:body-cell-value='props')
                q-td(:props='props')
                  span.text-weight-medium {{ props.row.value }}
              template(v-slot:body-cell-progress='props')
                q-td(:props='props')
                  q-linear-progress(
                    v-if='props.row.progressValue !== null'
                    rounded
                    size='8px'
                    color='primary'
                    track-color='grey-3'
                    :value='props.row.progressValue / 100'
                  )
                  span.text-grey-6(v-else) -
              template(v-slot:body-cell-trend='props')
                q-td(:props='props')
                  client-only
                    VChart(
                      :option='miniTrendChartOptions(metricSeries(props.row.trendKey))'
                      autoresize
                      style='height: 30px; width: 90px;'
                    )

    //- q-card.q-mt-md(v-if='futureCheckCards.length' flat bordered)
    //-   q-card-section
    //-     .row.items-center.no-wrap
    //-       q-icon(name='mdi-timeline-clock-outline' size='22px' class='q-mr-sm' color='warning')
    //-       .text-subtitle2 Contrôles prévus (phase suivante)
    //-   q-separator
    //-   q-card-section
    //-     .row.q-col-gutter-md
    //-       .col-12.col-md-6(v-for='card in futureCheckCards' :key='card.key')
    //-         q-banner(dense rounded class='bg-grey-2 text-dark')
    //-           .row.items-center.justify-between
    //-             .row.items-center.no-wrap
    //-               q-icon(:name='futureCheckIcon(card.key)' size='18px' class='q-mr-xs' color='grey-8')
    //-               .text-body2 {{ card.label }}
    //-             q-chip(
    //-               dense
    //-               square
    //-               :color='card.enabled ? "positive" : "grey-7"'
    //-               text-color='white'
    //-               :label='card.enabled ? "ACTIF" : "INACTIF"'
    //-             )
    //-           .text-caption.q-mt-xs {{ card.note }}
</template>

<script lang="ts">
import { computed, watch } from 'vue'
import VChart from 'vue-echarts'
import ReconnectingEventSource from 'reconnecting-eventsource'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import { CanvasRenderer } from 'echarts/renderers'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'

use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

type HealthRecord = Record<string, unknown>
type HealthApiResponse = {
  status?: string
  details?: Record<string, HealthRecord>
  system?: Record<string, HealthRecord>
  futureChecks?: Record<string, HealthRecord>
  history?: HealthHistorySnapshot[]
}
type HealthHttpResponse = HealthApiResponse | { data: HealthApiResponse }
type HealthHistorySnapshot = {
  timestamp: number
  status?: string
  details?: Record<string, HealthRecord>
  system?: Record<string, HealthRecord>
}
type MetricRow = {
  id: string
  metric: string
  value: string
  unit: string
  trendKey: string
  progressValue: number | null
}

export default defineNuxtComponent({
  name: 'SettingsHealthPage',
  components: {
    VChart,
  },
  setup() {
    const { data, pending, error, refresh } = useHttp<HealthHttpResponse>('/core/health', {
      method: 'GET',
    })
    const streamedPayload = ref<HealthApiResponse | null>(null)

    const normalizeHealthPayload = (value: HealthHttpResponse | null | undefined): HealthApiResponse | null => {
      if (!value) {
        return null
      }
      if ('data' in value) {
        return value.data
      }
      return value
    }

    const healthPayload = computed(() => {
      if (streamedPayload.value) {
        return streamedPayload.value
      }
      return normalizeHealthPayload(data.value)
    })

    const indicatorCards = computed(() => {
      const details = (healthPayload.value?.details || {}) as Record<string, HealthRecord>
      return Object.entries(details).map(([key, value]) => {
        const status = typeof value?.status === 'string' ? value.status : 'unknown'
        const metrics = Object.entries(value || {})
          .filter(([metric]) => metric !== 'status')
          .map(([label, metricValue]) => ({ label, value: metricValue }))

        return { key, status, metrics }
      })
    })

    const systemCards = computed(() => {
      const system = (healthPayload.value?.system || {}) as Record<string, HealthRecord>
      return Object.entries(system).map(([key, value]) => ({
        key,
        label: key === 'cpu' ? 'Ressources CPU' : key === 'memory' ? 'Ressources mémoire' : key,
        metrics: Object.entries(value || {}).map(([label, metricValue]) => ({ label, value: metricValue })),
      }))
    })

    const serviceMetricColumns = [
      { name: 'metric', label: 'Metrique', field: 'metric', align: 'left' as const },
      { name: 'value', label: 'Valeur', field: 'value', align: 'right' as const },
      { name: 'unit', label: 'Unite', field: 'unit', align: 'left' as const },
      { name: 'trend', label: 'Evolution', field: 'trendKey', align: 'left' as const },
    ]

    const systemMetricColumns = [
      { name: 'metric', label: 'Metrique', field: 'metric', align: 'left' as const },
      { name: 'value', label: 'Valeur', field: 'value', align: 'right' as const },
      { name: 'unit', label: 'Unite', field: 'unit', align: 'left' as const },
      { name: 'progress', label: 'Niveau', field: 'progressValue', align: 'left' as const },
      { name: 'trend', label: 'Evolution', field: 'trendKey', align: 'left' as const },
    ]

    const futureCheckCards = computed(() => {
      const checks = (healthPayload.value?.futureChecks || {}) as Record<string, HealthRecord>
      return Object.entries(checks).map(([key, value]) => ({
        key,
        label: key === 'externalExposure' ? 'Exposition externe' : key === 'leakedPasswords' ? 'Mots de passe fuités' : key,
        enabled: Boolean(value?.enabled),
        note: `${value?.status || 'unknown'}${value?.note ? ` - ${value.note}` : ''}`,
      }))
    })

    const upIndicators = computed(() => indicatorCards.value.filter((card) => card.status === 'up').length)
    const downIndicators = computed(() => indicatorCards.value.filter((card) => card.status === 'down').length)
    const unknownIndicators = computed(() => Math.max(0, indicatorCards.value.length - upIndicators.value - downIndicators.value))

    const currentCpuLoadPercent = computed(() => {
      const cpuMetrics = (healthPayload.value?.system?.cpu || {}) as Record<string, unknown>
      const loadPerCore = cpuMetrics['load1mPerCore']
      if (typeof loadPerCore !== 'number' || Number.isNaN(loadPerCore)) {
        return '-'
      }
      return `${Math.round(loadPerCore * 100)}%`
    })

    const currentRssMb = computed(() => {
      const memoryMetrics = (healthPayload.value?.system?.memory || {}) as Record<string, unknown>
      const rssMb = memoryMetrics['rssMb']
      if (typeof rssMb !== 'number' || Number.isNaN(rssMb)) {
        return '-'
      }
      return `${Math.round(rssMb)} MB`
    })

    const statsCards = computed(() => {
      const cards = [
        {
          key: 'global',
          label: 'Statut global',
          value: (healthPayload.value?.status || 'unknown').toUpperCase(),
          icon: 'mdi-shield-check',
          color: statusColor(healthPayload.value?.status || 'unknown'),
          tooltipTag: 'Synthese',
          tooltipMeaning: 'Etat global retourne par la sonde backend apres aggregation de tous les checks.',
          tooltipHow: 'UP = tous les checks critiques sont OK, DOWN = au moins un check critique est en erreur.',
        },
        {
          key: 'active',
          label: 'Services UP',
          value: `${upIndicators.value}/${indicatorCards.value.length}`,
          icon: 'mdi-check-decagram',
          color: 'positive',
          tooltipTag: 'Disponibles',
          tooltipMeaning: 'Nombre de checks operationnels parmi tous les services verifies.',
          tooltipHow: 'Plus ce ratio est proche de 100%, plus la plateforme est stable.',
        },
        {
          key: 'cpu',
          label: 'CPU 1m/core',
          value: currentCpuLoadPercent.value,
          icon: 'mdi-cpu-64-bit',
          color: 'primary',
          tooltipTag: 'Charge',
          tooltipMeaning: 'Charge CPU moyenne sur 1 minute, normalisee par nombre de coeurs.',
          tooltipHow: 'Exemple: 75% signifie une charge moderee; >90% de facon durable merite investigation.',
        },
        {
          key: 'rss',
          label: 'RSS',
          value: currentRssMb.value,
          icon: 'mdi-memory',
          color: 'secondary',
          tooltipTag: 'Memoire',
          tooltipMeaning: 'RSS (Resident Set Size) = memoire physique actuellement occupee par le processus Node.js.',
          tooltipHow: 'Si RSS monte en continu sans redescendre, cela peut signaler une fuite memoire.',
        },
      ]

      if (unknownIndicators.value > 0) {
        cards.push({
          key: 'unknown',
          label: 'Statut inconnu',
          value: `${unknownIndicators.value}`,
          icon: 'mdi-help-circle-outline',
          color: 'grey-7',
          tooltipTag: 'Incomplet',
          tooltipMeaning: 'Checks sans statut UP ou DOWN explicite.',
          tooltipHow: 'Verifier le format de reponse du check concerne pour exposer un statut clair.',
        })
      }

      return cards
    })

    const errorMessage = computed(() => {
      if (!error.value) {
        return ''
      }

      return error.value?.data?.message || error.value?.message || 'Impossible de récupérer les informations de santé.'
    })

    const statusColor = (status: string): string => {
      if (status === 'up') {
        return 'positive'
      }
      if (status === 'down') {
        return 'negative'
      }
      return 'grey-7'
    }

    const formatMetricValue = (value: unknown): string => {
      if (value === null || value === undefined) {
        return '-'
      }
      if (typeof value === 'number') {
        return Number.isInteger(value) ? `${value}` : value.toFixed(3)
      }
      if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      }
      if (typeof value === 'string') {
        return value
      }

      return JSON.stringify(value)
    }

    const beautifyMetricLabel = (label: string): string => {
      return label
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
    }

    const metricUnit = (label: string): string => {
      const normalizedLabel = label.toLowerCase()
      if (normalizedLabel.includes('percent') || normalizedLabel.includes('usage') || normalizedLabel.includes('ratio') || normalizedLabel.includes('cpu')) {
        return '%'
      }
      if (normalizedLabel.includes('latency') || normalizedLabel.includes('response') || normalizedLabel.endsWith('ms')) {
        return 'ms'
      }
      if (normalizedLabel.includes('uptime') || normalizedLabel.includes('duration') || normalizedLabel.includes('seconds')) {
        return 's'
      }
      if (normalizedLabel.includes('memory') || normalizedLabel.includes('heap') || normalizedLabel.includes('rss') || normalizedLabel.includes('bytes') || normalizedLabel.includes('size')) {
        return 'MB'
      }
      return ''
    }

    const normalizeMetricNumericValue = (label: string, value: unknown): number | null => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return null
      }
      const unit = metricUnit(label)
      if (unit === '%' && value <= 1) {
        return Math.round(value * 10000) / 100
      }
      if (unit === 'MB' && value > 1024) {
        return Math.round((value / (1024 * 1024)) * 100) / 100
      }
      return value
    }

    const formatMetricWithUnit = (label: string, value: unknown): { value: string; unit: string; numericValue: number | null } => {
      const unit = metricUnit(label)
      const numericValue = normalizeMetricNumericValue(label, value)
      if (numericValue !== null) {
        const roundedValue = Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(2)
        return { value: roundedValue, unit, numericValue }
      }
      return { value: formatMetricValue(value), unit, numericValue: null }
    }

    const metricHistory = ref<Record<string, number[]>>({})
    const serviceStatusHistory = ref<Record<string, number[]>>({})
    const availabilityHistory = ref<number[]>([])
    const maxHistoryPoints = 32

    const pushHistoryValue = (history: Record<string, number[]>, key: string, value: number): void => {
      if (!history[key]) {
        history[key] = []
      }
      history[key].push(value)
      if (history[key].length > maxHistoryPoints) {
        history[key].shift()
      }
    }

    const pushSeriesValue = (series: number[], value: number): void => {
      series.push(value)
      if (series.length > maxHistoryPoints) {
        series.shift()
      }
    }

    const asRecord = (value: unknown): Record<string, unknown> => {
      if (typeof value === 'object' && value !== null) {
        return value as Record<string, unknown>
      }
      return {}
    }

    const availabilityValueFromDetails = (details: Record<string, HealthRecord>): number => {
      const checks = Object.values(details)
      if (!checks.length) {
        return 0
      }
      const upChecks = checks.filter((entry) => entry?.status === 'up').length
      return Math.round((upChecks / checks.length) * 100)
    }

    const appendSnapshotToHistory = (snapshot: HealthHistorySnapshot): void => {
      const details = (snapshot.details || {}) as Record<string, HealthRecord>
      const system = (snapshot.system || {}) as Record<string, HealthRecord>

      Object.entries(details).forEach(([serviceKey, rawValue]) => {
        const normalizedStatus = rawValue?.status === 'up' ? 100 : rawValue?.status === 'down' ? 0 : 50
        pushHistoryValue(serviceStatusHistory.value, serviceKey, normalizedStatus)
      })

      Object.entries(system).forEach(([systemKey, rawValue]) => {
        const metrics = asRecord(rawValue)
        Object.entries(metrics).forEach(([metricLabel, metricValue]) => {
          const numericValue = normalizeMetricNumericValue(metricLabel, metricValue)
          if (numericValue !== null) {
            pushHistoryValue(metricHistory.value, `${systemKey}.${metricLabel}`, numericValue)
          }
        })
      })

      pushSeriesValue(availabilityHistory.value, availabilityValueFromDetails(details))
    }

    const historySnapshots = computed<HealthHistorySnapshot[]>(() => {
      if (!healthPayload.value) {
        return []
      }

      const snapshots = Array.isArray(healthPayload.value.history) ? healthPayload.value.history : []
      if (snapshots.length > 0) {
        return [...snapshots].sort((a, b) => a.timestamp - b.timestamp)
      }

      return [
        {
          timestamp: Date.now(),
          details: (healthPayload.value.details || {}) as Record<string, HealthRecord>,
          system: (healthPayload.value.system || {}) as Record<string, HealthRecord>,
        },
      ]
    })

    const timelineLabels = computed(() => {
      return historySnapshots.value.map((snapshot) =>
        new Date(snapshot.timestamp).toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      )
    })

    const cpuLoadSeries = computed(() =>
      historySnapshots.value.map((snapshot) => {
        const cpu = asRecord(asRecord(snapshot.system)['cpu'])
        const value = cpu['load1mPerCore']
        return typeof value === 'number' ? Math.round(value * 10000) / 100 : 0
      }),
    )
    const heapSeries = computed(() =>
      historySnapshots.value.map((snapshot) => {
        const memory = asRecord(asRecord(snapshot.system)['memory'])
        const value = memory['heapUsedMb']
        return typeof value === 'number' ? Math.round(value * 100) / 100 : 0
      }),
    )
    const rssSeries = computed(() =>
      historySnapshots.value.map((snapshot) => {
        const memory = asRecord(asRecord(snapshot.system)['memory'])
        const value = memory['rssMb']
        return typeof value === 'number' ? Math.round(value * 100) / 100 : 0
      }),
    )

    watch(
      healthPayload,
      () => {
        if (!healthPayload.value) {
          metricHistory.value = {}
          serviceStatusHistory.value = {}
          availabilityHistory.value = []
          return
        }

        metricHistory.value = {}
        serviceStatusHistory.value = {}
        availabilityHistory.value = []

        const snapshots = Array.isArray(healthPayload.value.history) ? healthPayload.value.history : []
        if (snapshots.length) {
          snapshots.forEach((snapshot) => appendSnapshotToHistory(snapshot))
          return
        }

        appendSnapshotToHistory({
          timestamp: Date.now(),
          details: (healthPayload.value.details || {}) as Record<string, HealthRecord>,
          system: (healthPayload.value.system || {}) as Record<string, HealthRecord>,
        })
      },
      { immediate: true },
    )

    const serviceMetricRows = (card: { key: string; metrics: Array<{ label: string; value: unknown }> }): MetricRow[] => {
      return card.metrics.map((metric) => {
        const normalized = formatMetricWithUnit(metric.label, metric.value)
        const unitAwareProgress = normalized.unit === '%' && normalized.numericValue !== null ? Math.max(0, Math.min(100, normalized.numericValue)) : null
        return {
          id: `${card.key}.${metric.label}`,
          metric: beautifyMetricLabel(metric.label),
          value: normalized.value,
          unit: normalized.unit || '-',
          trendKey: `${card.key}.${metric.label}`,
          progressValue: unitAwareProgress,
        }
      })
    }

    const systemMetricRows = (card: { key: string; metrics: Array<{ label: string; value: unknown }> }): MetricRow[] => {
      return card.metrics.map((metric) => {
        const normalized = formatMetricWithUnit(metric.label, metric.value)
        const unitAwareProgress = normalized.unit === '%' && normalized.numericValue !== null ? Math.max(0, Math.min(100, normalized.numericValue)) : null
        return {
          id: `${card.key}.${metric.label}`,
          metric: beautifyMetricLabel(metric.label),
          value: normalized.value,
          unit: normalized.unit || '-',
          trendKey: `${card.key}.${metric.label}`,
          progressValue: unitAwareProgress,
        }
      })
    }

    const metricSeries = (trendKey: string): number[] => metricHistory.value[trendKey] || []
    const serviceStatusSeries = (serviceKey: string): number[] => serviceStatusHistory.value[serviceKey] || []
    const resourcesTrendChartOptions = computed(() => ({
      animation: false,
      legend: {
        top: 0,
      },
      grid: { top: 30, right: 26, bottom: 20, left: 26 },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: timelineLabels.value,
      },
      yAxis: [
        {
          type: 'value',
          name: 'CPU (%)',
          min: 0,
          axisLabel: { formatter: '{value}%' },
        },
        {
          type: 'value',
          name: 'Memoire (MB)',
          axisLabel: { formatter: '{value}' },
        },
      ],
      series: [
        { name: 'CPU 1m/core', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, data: cpuLoadSeries.value, lineStyle: { color: '#1976d2', width: 2.2 } },
        { name: 'Heap MB', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: heapSeries.value, lineStyle: { color: '#8E44AD', width: 2.2 } },
        { name: 'RSS MB', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: rssSeries.value, lineStyle: { color: '#2C7A7B', width: 2.2 } },
      ],
    }))

    const miniTrendChartOptions = (series: number[], color = '#1976d2') => ({
      animation: false,
      grid: { top: 2, right: 2, bottom: 2, left: 2 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        show: false,
        data: series.map((_, index) => `${index}`),
      },
      yAxis: {
        type: 'value',
        show: false,
        min: Math.min(...series, 0),
        max: Math.max(...series, 100),
      },
      tooltip: {
        show: false,
      },
      series: [
        {
          type: 'line',
          data: series,
          smooth: true,
          symbol: 'none',
          lineStyle: {
            color,
            width: 2,
          },
          areaStyle: {
            color: `${color}22`,
          },
        },
      ],
    })

    const displayServiceLabel = (key: string): string => {
      const labels: Record<string, string> = {
        database: 'Base de donnees',
        redis: 'Cache Redis',
        disk: 'Stockage disque',
      }
      return labels[key] || key
    }

    const serviceIcon = (key: string): string => {
      const icons: Record<string, string> = {
        database: 'mdi-database',
        redis: 'mdi-memory',
        disk: 'mdi-harddisk',
        uptime: 'mdi-timer-outline',
        queue: 'mdi-format-list-checks',
      }
      return icons[key] || 'mdi-cog-outline'
    }

    const systemIcon = (key: string): string => {
      const icons: Record<string, string> = {
        cpu: 'mdi-cpu-64-bit',
        memory: 'mdi-memory',
        disk: 'mdi-harddisk',
      }
      return icons[key] || 'mdi-desktop-classic'
    }

    const futureCheckIcon = (key: string): string => {
      const icons: Record<string, string> = {
        externalExposure: 'mdi-earth',
        leakedPasswords: 'mdi-lock-alert',
      }
      return icons[key] || 'mdi-progress-question'
    }


    const lastRefreshTime = ref(Date.now())
    const refreshHealth = async (): Promise<void> => {
      await refresh()
      const normalized = normalizeHealthPayload(data.value)
      if (normalized) {
        streamedPayload.value = normalized
      }
      lastRefreshTime.value = Date.now()
    }

    const refreshIntervalInSeconds = 5
    const healthSse = ref<ReconnectingEventSource | null>(null)
    const nowTimestamp = ref(Date.now())
    const clockInterval = setInterval(() => {
      nowTimestamp.value = Date.now()
    }, 1_000)

    onMounted(() => {
      const sseUrl = new URL(window.location.origin + '/api/core/health/sse')
      const source = new ReconnectingEventSource(sseUrl.toString())
      healthSse.value = source
      source.onmessage = (event: MessageEvent) => {
        if (!event?.data || event.data === 'keepalive') {
          return
        }

        try {
          const parsedData = JSON.parse(event.data) as HealthApiResponse
          streamedPayload.value = parsedData
          lastRefreshTime.value = Date.now()
        } catch {
          // Ignore malformed SSE payload and keep latest valid snapshot.
        }
      }
    })

    onUnmounted(() => {
      if (healthSse.value) {
        healthSse.value.close()
      }
      clearInterval(clockInterval)
    })

    const secondsBeforeRefresh = computed(() => {
      const elapsedSeconds = Math.round((nowTimestamp.value - lastRefreshTime.value) / 1_000)
      return Math.max(0, refreshIntervalInSeconds - elapsedSeconds)
    })

    return {
      lastRefreshTime,
      secondsBeforeRefresh,
      pending,
      healthPayload,
      indicatorCards,
      systemCards,
      futureCheckCards,
      statsCards,
      upIndicators,
      downIndicators,
      serviceMetricColumns,
      systemMetricColumns,
      serviceMetricRows,
      systemMetricRows,
      metricSeries,
      serviceStatusSeries,
      availabilityHistory,
      historySnapshots,
      resourcesTrendChartOptions,
      miniTrendChartOptions,
      errorMessage,
      refreshHealth,
      statusColor,
      displayServiceLabel,
      serviceIcon,
      systemIcon,
      futureCheckIcon,
      formatMetricValue,
    }
  },
})
</script>
