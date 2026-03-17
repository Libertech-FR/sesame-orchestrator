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
    q-banner.q-mb-md(
      v-if='errorMessage'
      rounded
      dense
      class='bg-negative text-white'
      inline-actions
    )
      span {{ errorMessage }}

    q-card.q-mb-md(v-if='healthPayload')
      q-card-section.row.items-center.justify-between
        .text-subtitle1 Statut global
        q-chip(
          square
          :color="statusColor(healthPayload.status)"
          text-color='white'
          :label="(healthPayload.status || 'unknown').toUpperCase()"
        )
      q-separator
      q-card-section
        .text-body2
          strong Indicateurs disponibles:
          span.q-ml-xs {{ indicatorCards.length }}

    .row.q-col-gutter-md(v-if='indicatorCards.length')
      .col-12.col-md-6.col-lg-4(v-for='card in indicatorCards' :key='card.key')
        q-card.fit
          q-card-section.row.items-center.justify-between
            .text-subtitle2 {{ card.key }}
            q-chip(
              dense
              square
              :color='statusColor(card.status)'
              text-color='white'
              :label='card.status.toUpperCase()'
            )
          q-separator
          q-card-section
            .text-caption.text-grey-7(v-if='!card.metrics.length') Aucun détail de métrique.
            .row.items-center.justify-between.q-py-xs(v-for='metric in card.metrics' :key='`${card.key}-${metric.label}`')
              .text-caption {{ metric.label }}
              .text-body2 {{ formatMetricValue(metric.value) }}

    .row.q-col-gutter-md.q-mt-sm(v-if='systemCards.length')
      .col-12.col-md-6(v-for='card in systemCards' :key='card.key')
        q-card
          q-card-section
            .text-subtitle2 {{ card.label }}
          q-separator
          q-card-section
            .row.items-center.justify-between.q-py-xs(v-for='metric in card.metrics' :key='`${card.key}-${metric.label}`')
              .text-caption {{ metric.label }}
              .text-body2 {{ formatMetricValue(metric.value) }}

    q-card.q-mt-md(v-if='futureCheckCards.length')
      q-card-section
        .text-subtitle2 Contrôles prévus (phase suivante)
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12.col-md-6(v-for='card in futureCheckCards' :key='card.key')
            q-banner(dense rounded class='bg-grey-2 text-dark')
              .row.items-center.justify-between
                .text-body2 {{ card.label }}
                q-chip(
                  dense
                  square
                  :color='card.enabled ? "positive" : "grey-7"'
                  text-color='white'
                  :label='card.enabled ? "ACTIF" : "INACTIF"'
                )
              .text-caption.q-mt-xs {{ card.note }}
</template>

<script lang="ts">
import { computed } from 'vue'

type HealthRecord = Record<string, unknown>
type HealthApiResponse = {
  status?: string
  details?: Record<string, HealthRecord>
  system?: Record<string, HealthRecord>
  futureChecks?: Record<string, HealthRecord>
}

export default defineNuxtComponent({
  name: 'SettingsHealthPage',
  async setup() {
    const { data, pending, error, refresh } = await useHttp<HealthApiResponse | { data: HealthApiResponse }>('/core/health', {
      method: 'GET',
    })

    const healthPayload = computed(() => data.value?.data || data.value || null)

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

    const futureCheckCards = computed(() => {
      const checks = (healthPayload.value?.futureChecks || {}) as Record<string, HealthRecord>
      return Object.entries(checks).map(([key, value]) => ({
        key,
        label: key === 'externalExposure' ? 'Exposition externe' : key === 'leakedPasswords' ? 'Mots de passe fuités' : key,
        enabled: Boolean(value?.enabled),
        note: `${value?.status || 'unknown'}${value?.note ? ` - ${value.note}` : ''}`,
      }))
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


    const lastRefreshTime = ref(Date.now())
    const refreshHealth = async (): Promise<void> => {
      await refresh()
      lastRefreshTime.value = Date.now()
    }

    const refreshIntervalInSeconds = 60
    const healthRefreshInterval = setInterval(refreshHealth, refreshIntervalInSeconds * 1_000)
    const nowTimestamp = ref(Date.now())
    const clockInterval = setInterval(() => {
      nowTimestamp.value = Date.now()
    }, 1_000)
    onUnmounted(() => {
      clearInterval(healthRefreshInterval)
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
      errorMessage,
      refreshHealth,
      statusColor,
      formatMetricValue,
    }
  },
})
</script>
