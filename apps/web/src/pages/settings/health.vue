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
          .text-subtitle2 Tendances detaillées
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12
            .text-caption.text-grey-7.q-mb-xs Ressources système (CPU / Heap / RSS)
            client-only(v-if='historySnapshots.length > 1')
              VChart(
                :option='resourcesTrendChartOptions'
                autoresize
                style='height: 260px; width: 100%;'
              )
            .text-caption.text-grey-7.q-pa-sm(v-else) Données insuffisantes pour tracer une tendance.

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center.justify-between
        .row.items-center.no-wrap
          q-icon(name='mdi-lifebuoy' size='22px' class='q-mr-sm' :color='supportStatusColor')
          .text-subtitle1 Support & maintenance
        q-chip(
          square
          :color='supportStatusColor'
          text-color='white'
          :label='supportStatusLabel'
        )
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12.col-md-6
            .text-caption.text-grey-7 Support
            .text-subtitle2.text-weight-medium {{ supportProvider }}
          .col-12.col-md-6
            .text-caption.text-grey-7 Clé de support
            .row.items-center.no-wrap
              .text-subtitle2.text-weight-medium {{ supportKey }}
              q-spinner.q-ml-sm(v-if='supportKeyVerificationStatus === "checking"' color='primary' size='18px')
              q-icon.q-ml-sm(v-else-if='hasMaintenanceContract' :name='supportKeyValidationIcon' :color='supportKeyValidationColor' size='18px')
              q-tooltip.text-body2(v-if='hasMaintenanceContract' anchor='top middle' self='bottom middle')
                | {{ supportKeyValidationMessage }}
        .text-caption.text-grey-7.q-mt-sm {{ supportStatusMessage }}

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

    q-banner.q-mb-md(dense rounded class='bg-grey-1 text-grey-9')
      .row.items-center.no-wrap
        q-icon(name='mdi-information-outline' size='18px' class='q-mr-xs' color='primary')
        .text-caption
          | Astuce: survolez les métriques pour plus de contexte, puis utilisez la colonne Evolution pour voir la tendance récente.

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
              no-data-label='Aucune métrique disponible pour ce service.'
            )
              template(v-slot:body-cell-metric='props')
                q-td(:props='props')
                  span {{ props.row.metric }}
                  q-tooltip.text-body2(anchor='top middle' self='bottom middle')
                    | {{ metricHelpText(props.row.metric) }}
              template(v-slot:body-cell-value='props')
                q-td(:props='props')
                  span.text-weight-medium {{ props.row.value }}
              template(v-slot:body-cell-trend='props')
                q-td(:props='props')
                  .row.items-center.no-wrap
                    q-icon(:name='metricTrendSummary(props.row.trendKey).icon' :color='metricTrendSummary(props.row.trendKey).color' size='16px')
                    span.text-caption.q-ml-xs {{ metricTrendSummary(props.row.trendKey).label }}
                  client-only(v-if='metricSeries(props.row.trendKey).length > 1')
                    VChart(
                      :option='miniTrendChartOptions(metricSeries(props.row.trendKey))'
                      autoresize
                      style='height: 30px; width: 90px;'
                    )
                  span.text-caption.text-grey-6(v-else) Données insuffisantes

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
              no-data-label='Aucune métrique système disponible.'
            )
              template(v-slot:body-cell-metric='props')
                q-td(:props='props')
                  span {{ props.row.metric }}
                  q-tooltip.text-body2(anchor='top middle' self='bottom middle')
                    | {{ metricHelpText(props.row.metric) }}
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
                  .row.items-center.no-wrap
                    q-icon(:name='metricTrendSummary(props.row.trendKey).icon' :color='metricTrendSummary(props.row.trendKey).color' size='16px')
                    span.text-caption.q-ml-xs {{ metricTrendSummary(props.row.trendKey).label }}
                  client-only(v-if='metricSeries(props.row.trendKey).length > 1')
                    VChart(
                      :option='miniTrendChartOptions(metricSeries(props.row.trendKey))'
                      autoresize
                      style='height: 30px; width: 90px;'
                    )
                  span.text-caption.text-grey-6(v-else) Données insuffisantes

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
import * as Sentry from '@sentry/nuxt'
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
    const runtimeConfig = useRuntimeConfig()
    const sentryDsn = computed(() => `${runtimeConfig.public?.sentry?.dsn || ''}`.trim())
    const supportProviderFromDomain = (domain: string): string => {
      const normalizedDomain = domain.toLowerCase()
      if (normalizedDomain.endsWith('libertech.fr')) {
        return 'Libertech-FR'
      }
      return domain
    }
    const parseSentrySupport = (dsn: string): { key: string; domain: string; provider: string } => {
      if (!dsn) {
        return { key: '-', domain: '-', provider: '-' }
      }

      try {
        const parsedUrl = new URL(dsn)
        const key = decodeURIComponent(parsedUrl.username || '').trim() || '-'
        const domain = parsedUrl.hostname?.trim() || '-'
        const provider = domain === '-' ? '-' : supportProviderFromDomain(domain)
        return { key, domain, provider }
      } catch {
        return { key: '-', domain: '-', provider: '-' }
      }
    }
    const sentrySupport = computed(() => parseSentrySupport(sentryDsn.value))
    const hasMaintenanceContract = computed(() => sentryDsn.value.length > 0)
    const supportKey = computed(() => sentrySupport.value.key)
    const supportProvider = computed(() => sentrySupport.value.provider)
    const supportKeyFormatIsValid = computed(() => /^[a-f0-9]{32}$/i.test(supportKey.value))
    const supportKeyVerificationStatus = ref<'idle' | 'checking' | 'valid' | 'invalid'>('idle')
    const supportKeyValidationDetail = ref('')
    const verifySupportKeyWithSentry = async (): Promise<void> => {
      try {
        if (!hasMaintenanceContract.value) {
          supportKeyVerificationStatus.value = 'idle'
          supportKeyValidationDetail.value = ''
          return
        }

        if (!supportKeyFormatIsValid.value) {
          supportKeyVerificationStatus.value = 'invalid'
          supportKeyValidationDetail.value = 'Format de cle Sentry invalide.'
          return
        }

        supportKeyVerificationStatus.value = 'checking'
        supportKeyValidationDetail.value = ''

        const getClientFn = (Sentry as unknown as { getClient?: () => unknown }).getClient
        if (typeof getClientFn !== 'function') {
          supportKeyVerificationStatus.value = 'invalid'
          supportKeyValidationDetail.value = 'Client Sentry indisponible.'
          return
        }

        const sentryClient = getClientFn() as { getDsn?: () => { publicKey?: string } | undefined } | null
        const dsnPublicKey = sentryClient?.getDsn?.()?.publicKey || ''
        if (dsnPublicKey.toLowerCase() !== supportKey.value.toLowerCase()) {
          supportKeyVerificationStatus.value = 'invalid'
          supportKeyValidationDetail.value = 'Cle differente de celle initialisee par le SDK Sentry.'
          return
        }

        const parsedUrl = new URL(sentryDsn.value)
        const projectId = parsedUrl.pathname.replace(/\//g, '')
        if (!projectId) {
          supportKeyVerificationStatus.value = 'invalid'
          supportKeyValidationDetail.value = 'ProjectId absent du DSN.'
          return
        }

        const envelopeUrl = `${parsedUrl.origin}/api/${projectId}/envelope/?sentry_version=7&sentry_key=${encodeURIComponent(
          supportKey.value,
        )}&sentry_client=sesame.support-check`
        const envelopeBody = `${JSON.stringify({
          sent_at: new Date().toISOString(),
          dsn: sentryDsn.value,
        })}\n${JSON.stringify({ type: 'client_report' })}\n${JSON.stringify({
          timestamp: Math.floor(Date.now() / 1_000),
          discarded_events: [],
        })}`
        const response = await fetch(envelopeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain;charset=UTF-8',
          },
          body: envelopeBody,
        })

        if (response.ok) {
          supportKeyVerificationStatus.value = 'valid'
          supportKeyValidationDetail.value = ''
          return
        }

        supportKeyVerificationStatus.value = 'invalid'
        let reason = ''
        try {
          const payload = (await response.json()) as { detail?: string }
          reason = payload?.detail || ''
        } catch {
          reason = ''
        }
        supportKeyValidationDetail.value = reason || `Validation Sentry en echec (${response.status} ${response.statusText}).`
      } catch {
        supportKeyVerificationStatus.value = 'invalid'
        supportKeyValidationDetail.value = 'Erreur reseau pendant la verification Sentry.'
      }
    }
    const supportKeyIsValid = computed(() => supportKeyVerificationStatus.value === 'valid')
    const supportKeyValidationIcon = computed(() => (supportKeyIsValid.value ? 'mdi-check-decagram' : 'mdi-alert-circle'))
    const supportKeyValidationColor = computed(() => (supportKeyIsValid.value ? 'positive' : 'warning'))
    const supportKeyValidationMessage = computed(() =>
      supportKeyVerificationStatus.value === 'checking'
        ? 'Verification en cours via Sentry.'
        : supportKeyVerificationStatus.value === 'valid'
          ? 'Cle de support valide (verification Sentry OK).'
          : supportKeyValidationDetail.value || 'Cle de support invalide.',
    )
    const supportStatusLabel = computed(() => {
      if (!hasMaintenanceContract.value) {
        return 'INACTIF'
      }
      if (supportKeyVerificationStatus.value === 'valid') {
        return 'ACTIF'
      }
      if (supportKeyVerificationStatus.value === 'checking' || supportKeyVerificationStatus.value === 'idle') {
        return 'VERIFICATION'
      }
      return 'INVALIDE'
    })
    const supportStatusColor = computed(() => {
      if (!hasMaintenanceContract.value) {
        return 'grey-7'
      }
      if (supportKeyVerificationStatus.value === 'valid') {
        return 'positive'
      }
      if (supportKeyVerificationStatus.value === 'checking' || supportKeyVerificationStatus.value === 'idle') {
        return 'primary'
      }
      return 'negative'
    })
    const supportStatusMessage = computed(() => {
      if (!hasMaintenanceContract.value) {
        return 'Maintenance inactive, support open source sur GitHub.'
      }
      if (supportKeyVerificationStatus.value === 'valid') {
        return 'Contrat de maintenance actif.'
      }
      if (supportKeyVerificationStatus.value === 'checking' || supportKeyVerificationStatus.value === 'idle') {
        return 'Verification de la clé de maintenance en cours...'
      }
      return 'Contrat de maintenance configuré, mais clé de maintenance invalide.'
    })

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
      const httpPayload = normalizeHealthPayload(data.value)
      const livePayload = streamedPayload.value

      if (!livePayload) {
        return httpPayload
      }

      const liveHistory = Array.isArray(livePayload.history) ? livePayload.history : []
      const httpHistory = Array.isArray(httpPayload?.history) ? httpPayload.history : []

      return {
        ...(httpPayload || {}),
        ...livePayload,
        // Some SSE frames may omit history; keep the last HTTP history instead of dropping trends.
        history: liveHistory.length > 0 ? liveHistory : httpHistory,
      } as HealthApiResponse
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
      { name: 'metric', label: 'Métrique', field: 'metric', align: 'left' as const },
      { name: 'value', label: 'Valeur', field: 'value', align: 'right' as const },
      { name: 'unit', label: 'Unité', field: 'unit', align: 'left' as const },
      { name: 'trend', label: 'Evolution', field: 'trendKey', align: 'left' as const },
    ]

    const systemMetricColumns = [
      { name: 'metric', label: 'Métrique', field: 'metric', align: 'left' as const },
      { name: 'value', label: 'Valeur', field: 'value', align: 'right' as const },
      { name: 'unit', label: 'Unité', field: 'unit', align: 'left' as const },
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
      return `${Math.round(rssMb)} Mb`
    })
    const currentTotalSystemMemoryMb = computed(() => {
      const memoryMetrics = (healthPayload.value?.system?.memory || {}) as Record<string, unknown>
      const totalSystemMemoryMb = memoryMetrics['totalSystemMemoryMb']
      if (typeof totalSystemMemoryMb !== 'number' || Number.isNaN(totalSystemMemoryMb)) {
        return '-'
      }
      return `${totalSystemMemoryMb.toFixed(2)} Mb`
    })
    const currentCpuCores = computed(() => {
      const cpuMetrics = (healthPayload.value?.system?.cpu || {}) as Record<string, unknown>
      const cores = cpuMetrics['cores']
      if (typeof cores !== 'number' || Number.isNaN(cores)) {
        return '-'
      }
      return `${Math.round(cores)}`
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
        {
          key: 'total-memory',
          label: 'Memoire système totale',
          value: currentTotalSystemMemoryMb.value,
          icon: 'mdi-memory-arrow-down',
          color: 'indigo',
          tooltipTag: 'Capacite',
          tooltipMeaning: 'Memoire totale visible par le runtime applicatif (conteneur/VM).',
          tooltipHow: 'Metrique plutot statique, utile comme reference de capacite.',
        },
        {
          key: 'cpu-cores',
          label: 'Nombre de cores',
          value: currentCpuCores.value,
          icon: 'mdi-chip',
          color: 'deep-orange',
          tooltipTag: 'Capacite CPU',
          tooltipMeaning: 'Nombre de cores CPU visibles par le runtime applicatif.',
          tooltipHow: 'Metrique plutot statique, utile pour interpreter la charge CPU par core.',
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
        return value ? 'Oui' : 'Non'
      }
      if (typeof value === 'string') {
        return value
      }

      return JSON.stringify(value)
    }

    const beautifyMetricLabel = (label: string): string => {
      const metricLabelMap: Record<string, string> = {
        heapUsedMb: 'Mémoire heap utilisée',
        heapTotalMb: 'Mémoire heap totale',
        rssMb: 'Mémoire RSS',
        externalMb: 'Mémoire externe',
        arrayBuffersMb: 'Array buffers',
        nativeMb: 'Mémoire native',
        growthMb: 'Croissance mémoire native',
        growthThresholdMb: 'Seuil de croissance',
        sampleCount: 'Nombre d échantillons',
        totalSystemMemoryMb: 'Mémoire système totale',
        load1mPerCore: 'Charge CPU (1 min / core)',
        load5mPerCore: 'Charge CPU (5 min / core)',
        load15mPerCore: 'Charge CPU (15 min / core)',
        usedPercent: 'Utilisation',
        thresholdPercent: 'Seuil',
        threshold: 'Seuil CPU',
        thresholdMb: 'Seuil mémoire',
        usedMb: 'Mémoire utilisée',
        pingMs: 'Latence',
        status: 'Statut',
        cores: 'Nombre de cores',
      }
      if (metricLabelMap[label]) {
        return metricLabelMap[label]
      }

      return label
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .trim()
    }

    const metricHelpText = (metricLabel: string): string => {
      const normalizedLabel = metricLabel.toLowerCase()
      if (normalizedLabel === 'threshold') {
        return 'Seuil CPU exprime en ratio (0.85 = 85%).'
      }
      if (normalizedLabel === 'nativeMb'.toLowerCase()) {
        return 'Memoire native (external) vue par Node.js; inclut deja les Array buffers.'
      }
      if (normalizedLabel === 'arraybuffersmb') {
        return 'Part memoire des ArrayBuffer/Buffer, deja comprise dans la memoire externe.'
      }
      if (normalizedLabel === 'externalmb') {
        return 'Memoire externe V8 (objets natifs lies au JavaScript).'
      }
      if (normalizedLabel.includes('rss')) {
        return 'Memoire résidente du processus Node.js (RAM réellement occupée).'
      }
      if (normalizedLabel.includes('heap')) {
        return 'Mémoire JavaScript gérée par le moteur V8.'
      }
      if (normalizedLabel.includes('cpu') || normalizedLabel.includes('load')) {
        return 'Charge processeur observée sur la période récente.'
      }
      if (normalizedLabel.includes('latency') || normalizedLabel.includes('ping')) {
        return 'Temps de réponse de la dépendance surveillée.'
      }
      if (normalizedLabel.includes('storage') || normalizedLabel.includes('disk') || normalizedLabel.includes('used')) {
        return 'Occupation du stockage selon le seuil configuré.'
      }
      return 'Métrique technique issue des sondes de santé.'
    }

    const metricUnit = (label: string): string => {
      const normalizedLabel = label.toLowerCase()
      if (normalizedLabel === 'threshold') {
        return '%'
      }
      if (normalizedLabel.endsWith('mb')) {
        return 'Mb'
      }
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
        return 'Mb'
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
      return card.metrics
        .filter((metric) => !['totalSystemMemoryMb', 'cores'].includes(metric.label))
        .map((metric) => {
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
    const metricTrendSummary = (trendKey: string): { icon: string; color: string; label: string } => {
      const series = metricSeries(trendKey)
      if (series.length < 2) {
        return { icon: 'mdi-minus', color: 'grey-6', label: 'N/A' }
      }

      const previous = series[series.length - 2]
      const current = series[series.length - 1]
      const delta = current - previous
      if (Math.abs(delta) < 0.01) {
        return { icon: 'mdi-trending-neutral', color: 'grey-7', label: 'Stable' }
      }

      if (delta > 0) {
        return { icon: 'mdi-trending-up', color: 'warning', label: 'Hausse' }
      }

      return { icon: 'mdi-trending-down', color: 'positive', label: 'Baisse' }
    }
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
          name: 'Memoire (Mb)',
          axisLabel: { formatter: '{value}' },
        },
      ],
      series: [
        { name: 'CPU 1m/core', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 0, data: cpuLoadSeries.value, lineStyle: { color: '#1976d2', width: 2.2 } },
        { name: 'Heap Mb', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: heapSeries.value, lineStyle: { color: '#8E44AD', width: 2.2 } },
        { name: 'RSS Mb', type: 'line', smooth: true, symbol: 'none', yAxisIndex: 1, data: rssSeries.value, lineStyle: { color: '#2C7A7B', width: 2.2 } },
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
        memory_native: 'Memoire native',
      }
      return labels[key] || key
    }

    const serviceIcon = (key: string): string => {
      const icons: Record<string, string> = {
        database: 'mdi-database',
        redis: 'mdi-memory',
        disk: 'mdi-harddisk',
        memory_native: 'mdi-memory-arrow-up',
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

    const refreshIntervalInSeconds = 15
    const healthSse = ref<ReconnectingEventSource | null>(null)
    const nowTimestamp = ref(Date.now())
    const clockInterval = setInterval(() => {
      nowTimestamp.value = Date.now()
    }, 1_000)

    onMounted(() => {
      verifySupportKeyWithSentry()

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
      metricTrendSummary,
      metricHelpText,
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
      hasMaintenanceContract,
      supportKey,
      supportProvider,
      supportKeyVerificationStatus,
      supportKeyValidationIcon,
      supportKeyValidationColor,
      supportKeyValidationMessage,
      supportStatusLabel,
      supportStatusColor,
      supportStatusMessage,
    }
  },
})
</script>
