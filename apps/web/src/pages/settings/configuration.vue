<template lang="pug">
.sesame-page
  .sesame-page-content.q-pa-md
    .row.items-center.q-col-gutter-sm.q-mb-md
      .col
        h5.q-ma-none Configuration
        .text-caption.text-grey-7 Conteneur Docker Sesame — API et Web supervisés dans le même environnement
      .col-auto
        q-btn(icon='mdi-refresh' :loading='pending' @click='refreshAll' flat dense size='sm')
          q-tooltip.text-body2(anchor="top middle" self="bottom middle") Actualiser

    q-banner.q-mb-md(
      v-if='errorMessage'
      rounded
      dense
      class='bg-negative text-white'
    )
      span {{ errorMessage }}

    .row.q-col-gutter-md.q-mb-md
      .col-12.col-md-6.col-lg-3(v-for='card in summaryCards' :key='card.key')
        q-card.fit.summary-card(flat bordered)
          q-card-section.row.items-start.summary-card-section
            q-avatar(:color='card.color' text-color='white' size='42px' :icon='card.icon')
            .q-ml-md.summary-card-content
              .text-caption.text-grey-7.summary-card-line {{ card.label }}
              .text-subtitle1.text-weight-bold.summary-card-line {{ card.value }}
              .text-caption.text-grey-6.summary-card-line(v-if='card.hint')
                span {{ card.hint }}
                q-tooltip.text-body2(v-if='card.hintFull' anchor='top middle' self='bottom middle') {{ card.hintFull }}

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center.justify-between
        .row.items-center
          q-icon(name='mdi-docker' size='22px' class='q-mr-sm' color='primary')
          .text-subtitle1 Conteneur Docker
        q-chip(square color='positive' text-color='white' label='API + Web')
      q-separator
      q-card-section
        .row.q-col-gutter-md
          .col-12.col-md-6(v-for='row in containerRows' :key='row.label')
            .text-caption.text-grey-7 {{ row.label }}
            .text-body2.text-weight-medium.text-break {{ row.value }}

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center
        q-icon(name='mdi-cog-transfer' size='20px' class='q-mr-sm' color='primary')
        .text-subtitle1 Processus supervisés
      q-separator
      q-card-section
        q-table(
          dense
          flat
          bordered
          :rows='processRows'
          :columns='processColumns'
          row-key='name'
          hide-pagination
          :rows-per-page-options='[0]'
        )

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center
        q-icon(name='mdi-database' size='20px' class='q-mr-sm' color='primary')
        .text-subtitle1 Services & dépendances
      q-separator
      q-card-section
        q-table(
          dense
          flat
          bordered
          :rows='dependencyRows'
          :columns='dependencyColumns'
          row-key='id'
          hide-pagination
          :rows-per-page-options='[0]'
        )
          template(v-slot:body-cell-status='props')
            q-td(:props='props')
              q-chip(
                dense
                square
                :color='dependencyStatusColor(props.row.status)'
                text-color='white'
                :label='dependencyStatusLabel(props.row.status)'
              )

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center
        q-icon(name='mdi-cube-outline' size='20px' class='q-mr-sm' color='primary')
        .text-subtitle1 Versions des frameworks
      q-separator
      q-card-section
        q-table(
          dense
          flat
          bordered
          :rows='frameworkRows'
          :columns='frameworkColumns'
          row-key='id'
          hide-pagination
          :rows-per-page-options='[0]'
        )

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center.justify-between
        .row.items-center
          q-icon(name='mdi-folder-multiple' size='20px' class='q-mr-sm' color='primary')
          .text-subtitle1 Volumes Docker Sesame
        q-chip(
          v-if='inactiveVolumeCount > 0'
          square
          color='warning'
          text-color='white'
          :label='`${inactiveVolumeCount} volume(s) inactif(s)`'
        )
      q-separator
      q-card-section
        .row.q-col-gutter-md.q-mb-md(v-if='dockerMetadataRows.length')
          .col-12.col-md-6(v-for='row in dockerMetadataRows' :key='row.label')
            .text-caption.text-grey-7 {{ row.label }}
            .text-body2.text-weight-medium.text-break {{ row.value }}
        q-banner.q-mb-md(
          v-if='inactiveVolumeCount > 0'
          dense
          rounded
          class='bg-orange-1 text-orange-10'
        )
          .text-caption
            | Certains volumes attendus ne sont pas montés. Ajoutez-les dans le docker compose Sesame pour une configuration complète.
        q-table(
          dense
          flat
          bordered
          :rows='dockerVolumeRows'
          :columns='dockerVolumeColumns'
          row-key='id'
          hide-pagination
          :rows-per-page-options='[0]'
          no-data-label='Aucun volume Sesame référencé.'
        )
          template(v-slot:body-cell-status='props')
            q-td(:props='props')
              q-chip(
                dense
                square
                :color='props.row.status === "active" ? "positive" : "grey-6"'
                text-color='white'
                :label='props.row.status === "active" ? "Actif" : "Inactif"'
              )
          template(v-slot:body-cell-category='props')
            q-td(:props='props')
              q-chip(dense square :color='volumeCategoryColor(props.row.category)' text-color='white' :label='volumeCategoryLabel(props.row.category)')
          template(v-slot:body-cell-source='props')
            q-td(:props='props')
              span.text-break {{ props.row.source || '—' }}
          template(v-slot:body-cell-composeHint='props')
            q-td(:props='props')
              code.text-caption.text-break {{ props.row.composeHint }}
              q-tooltip.text-body2(anchor='top middle' self='bottom middle' v-if='props.row.status === "inactive"') Exemple de montage attendu dans docker compose

    q-card.q-mb-md(flat bordered)
      q-card-section.row.items-center
        q-icon(name='mdi-variable' size='20px' class='q-mr-sm' color='primary')
        .text-subtitle1 Variables d'environnement
      q-separator
      q-card-section
        q-table(
          dense
          flat
          bordered
          :rows='envRows'
          :columns='envColumns'
          row-key='id'
          hide-pagination
          :rows-per-page-options='[0]'
          no-data-label="Aucune variable d'environnement."
        )
          template(v-slot:body-cell-scope='props')
            q-td(:props='props')
              q-chip(dense square :color='scopeColor(props.row.scope)' text-color='white' :label='props.row.scope')
          template(v-slot:body-cell-value='props')
            q-td(:props='props')
              span(:class='props.row.sensitive ? "text-grey-6" : ""') {{ props.row.value || '—' }}
              q-icon.q-ml-xs(v-if='props.row.sensitive' name='mdi-lock' size='14px' color='grey-6')
                q-tooltip.text-body2 Valeur masquée (sensible)

    q-card(flat bordered)
      q-card-section.row.items-center
        q-icon(name='mdi-file-cog-outline' size='20px' class='q-mr-sm' color='primary')
        .text-subtitle1 Configuration résolue (API)
      q-separator
      q-card-section
        pre.config-json(v-if='resolvedConfigJson') {{ resolvedConfigJson }}
        .text-caption.text-grey-7(v-else) Configuration indisponible.
</template>

<script lang="ts">
interface EnvironmentVariable {
  key: string
  value: string
  sensitive: boolean
}

interface ConfigurationProcessInfo {
  pid: number
  uptimeSeconds: number
  cwd: string
}

interface ApiConfiguration {
  application: {
    name: string
    version: string
    description: string | null
    buildVersion: string | null
  }
  container: {
    hostname: string
    platform: string
    arch: string
    nodeEnv: string
    nodeVersion: string
    timezone: string
    cpuCores: number
    memoryTotalMb: number
    memoryFreeMb: number
    osUptimeSeconds: number
    imageTag: string
    git: {
      branch: string
      commit: string
    }
    volumes: Array<{
      id: string
      category: 'api' | 'web' | 'shared'
      label: string
      composeHint: string
      mountPoint: string
      status: 'active' | 'inactive'
      required: boolean
      source: string | null
      type: string | null
      options: string | null
      readOnly: boolean | null
    }>
    docker: {
      id: string | null
      name: string | null
      image: string | null
      labels: Record<string, string>
      inspectSource: 'docker-api' | 'mountinfo'
      socketAvailable: boolean
      inspectDetail: string | null
    }
    apiRootDir: string
    webRootDir: string
  }
  processes: {
    api: ConfigurationProcessInfo
  }
  frameworks: {
    node: string
    api: {
      nestjs: string | null
      mongoose: string | null
      express: string | null
      typescript: string | null
    }
    web: {
      nuxt: string | null
      vue: string | null
      quasar: string | null
      typescript: string | null
    }
  }
  environment: {
    api: EnvironmentVariable[]
  }
  dependencies: {
    mongodb: ConfigurationDependencyService
    redis: ConfigurationDependencyService
  }
  resolvedConfig: Record<string, unknown>
}

interface DependencyContainerMetadata {
  containerName: string
  image: string | null
  id: string | null
  status: string | null
  startedAt: string | null
  labels: Record<string, string>
}

interface ConfigurationDependencyService {
  status: 'up' | 'down' | 'unknown'
  serverVersion: string | null
  driverVersion: string | null
  endpoint: string | null
  docker: DependencyContainerMetadata | null
  metadata: Record<string, string>
}

interface WebRuntimeConfiguration {
  process: ConfigurationProcessInfo
  environment: {
    web: EnvironmentVariable[]
  }
}

type EnvScope = 'API' | 'Web' | 'API + Web'

interface MergedEnvironmentRow {
  id: string
  key: string
  value: string
  scope: EnvScope
  sensitive: boolean
}

export default defineNuxtComponent({
  name: 'SettingsConfigurationPage',
  async setup() {
    const errorMessage = ref('')
    const webConfig = ref<WebRuntimeConfiguration | null>(null)
    const webPending = ref(false)

    const {
      data: apiResult,
      error: apiError,
      pending: apiPending,
      refresh: refreshApiConfiguration,
    } = await useHttp<{ data: ApiConfiguration }>('/settings/configuration', {
      method: 'GET',
    })

    if (apiError.value) {
      console.error(apiError.value)
      throw showError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      })
    }

    const loadWebConfiguration = async () => {
      webPending.value = true

      try {
        webConfig.value = await $fetch<WebRuntimeConfiguration>('/config/runtime')
      } finally {
        webPending.value = false
      }
    }

    const refreshAll = async () => {
      errorMessage.value = ''

      try {
        await Promise.all([refreshApiConfiguration(), loadWebConfiguration()])
      } catch (error) {
        console.error(error)
        errorMessage.value = 'Impossible de charger la configuration. Vérifiez vos permissions et réessayez.'
      }
    }

    await loadWebConfiguration()

    const pending = computed(() => apiPending.value || webPending.value)
    const apiConfig = computed(() => apiResult.value?.data || null)

    const formatShortCommit = (commit?: string | null) => {
      if (!commit || commit === 'unknown') {
        return commit || undefined
      }

      if (commit.length <= 12) {
        return commit
      }

      return commit.slice(0, 8)
    }

    const summaryCards = computed(() => {
      const config = apiConfig.value
      const gitCommit = config?.container?.git?.commit

      return [
        {
          key: 'app-version',
          icon: 'mdi-tag-outline',
          color: 'primary',
          label: 'Version Sesame',
          value: config?.application?.version || '—',
          hint: config?.application?.name,
        },
        {
          key: 'docker-image',
          icon: 'mdi-docker',
          color: 'blue-grey-8',
          label: 'Image Docker',
          value: config?.container?.imageTag || '—',
          hint: 'Conteneur unique API + Web',
        },
        {
          key: 'node',
          icon: 'mdi-nodejs',
          color: 'green-8',
          label: 'Node.js',
          value: config?.container?.nodeVersion || '—',
          hint: config?.container?.nodeEnv,
        },
        {
          key: 'mongodb',
          icon: 'mdi-database',
          color: 'light-green-9',
          label: 'MongoDB',
          value: config?.dependencies?.mongodb?.serverVersion || '—',
          hint: config?.dependencies?.mongodb?.docker?.image || config?.dependencies?.mongodb?.driverVersion || undefined,
        },
        {
          key: 'redis',
          icon: 'mdi-database-outline',
          color: 'red-8',
          label: 'Redis',
          value: config?.dependencies?.redis?.serverVersion || '—',
          hint: config?.dependencies?.redis?.docker?.image || config?.dependencies?.redis?.driverVersion || undefined,
        },
        {
          key: 'git-branch',
          icon: 'mdi-source-branch',
          color: 'deep-purple-7',
          label: 'Branche Git',
          value: config?.container?.git?.branch || '—',
          hint: formatShortCommit(gitCommit),
          hintFull: gitCommit && gitCommit.length > 12 ? gitCommit : undefined,
        },
      ]
    })

    const containerRows = computed(() => {
      const container = apiConfig.value?.container
      if (!container) {
        return []
      }

      return [
        { label: 'Hôte conteneur', value: container.hostname },
        { label: 'Plateforme', value: `${container.platform} (${container.arch})` },
        { label: 'Node.js', value: `${container.nodeVersion} (${container.nodeEnv})` },
        { label: 'Fuseau horaire', value: container.timezone },
        { label: 'CPU (cœurs)', value: `${container.cpuCores}` },
        { label: 'Mémoire libre / totale', value: `${container.memoryFreeMb} Mo / ${container.memoryTotalMb} Mo` },
        { label: 'Uptime conteneur (OS)', value: `${container.osUptimeSeconds}s` },
        { label: 'Racine API', value: container.apiRootDir },
        { label: 'Racine Web', value: container.webRootDir },
        { label: 'Commit Git', value: container.git.commit },
      ]
    })

    const processColumns = [
      { name: 'name', label: 'Processus', field: 'name', align: 'left' as const },
      { name: 'pid', label: 'PID', field: 'pid', align: 'left' as const },
      { name: 'uptimeSeconds', label: 'Uptime', field: 'uptimeSeconds', align: 'left' as const },
      { name: 'cwd', label: 'Répertoire', field: 'cwd', align: 'left' as const },
    ]

    const processRows = computed(() => {
      const apiProcess = apiConfig.value?.processes?.api
      const webProcess = webConfig.value?.process

      return [
        apiProcess
          ? {
              name: 'API (NestJS)',
              pid: apiProcess.pid,
              uptimeSeconds: `${apiProcess.uptimeSeconds}s`,
              cwd: apiProcess.cwd,
            }
          : null,
        webProcess
          ? {
              name: 'Web (Nuxt)',
              pid: webProcess.pid,
              uptimeSeconds: `${webProcess.uptimeSeconds}s`,
              cwd: webProcess.cwd,
            }
          : null,
      ].filter(Boolean)
    })

    const frameworkColumns = [
      { name: 'component', label: 'Composant', field: 'component', align: 'left' as const },
      { name: 'package', label: 'Package', field: 'package', align: 'left' as const },
      { name: 'version', label: 'Version', field: 'version', align: 'left' as const },
    ]

    const dependencyColumns = [
      { name: 'status', label: 'État', field: 'status', align: 'left' as const },
      { name: 'service', label: 'Service', field: 'service', align: 'left' as const },
      { name: 'serverVersion', label: 'Version serveur', field: 'serverVersion', align: 'left' as const },
      { name: 'driverVersion', label: 'Driver Node', field: 'driverVersion', align: 'left' as const },
      { name: 'dockerImage', label: 'Image Docker', field: 'dockerImage', align: 'left' as const },
      { name: 'container', label: 'Conteneur', field: 'container', align: 'left' as const },
      { name: 'endpoint', label: 'Endpoint', field: 'endpoint', align: 'left' as const },
      { name: 'details', label: 'Métadonnées', field: 'details', align: 'left' as const },
    ]

    const buildDependencyRow = (
      id: string,
      service: string,
      dependency?: ConfigurationDependencyService,
    ) => {
      const metadata = dependency?.metadata || {}
      const metadataText = Object.entries(metadata)
        .filter(([, value]) => `${value}`.length > 0)
        .map(([key, value]) => `${key}: ${value}`)
        .join(' · ')

      return {
        id,
        service,
        status: dependency?.status || 'unknown',
        serverVersion: dependency?.serverVersion || '—',
        driverVersion: dependency?.driverVersion || '—',
        dockerImage: dependency?.docker?.image || '—',
        container: dependency?.docker?.containerName || '—',
        endpoint: dependency?.endpoint || '—',
        details: metadataText || '—',
      }
    }

    const dependencyRows = computed(() => {
      const dependencies = apiConfig.value?.dependencies
      if (!dependencies) {
        return []
      }

      return [
        buildDependencyRow('mongodb', 'MongoDB', dependencies.mongodb),
        buildDependencyRow('redis', 'Redis', dependencies.redis),
      ]
    })

    const dependencyStatusColor = (status: ConfigurationDependencyService['status']) => {
      if (status === 'up') {
        return 'positive'
      }

      if (status === 'down') {
        return 'negative'
      }

      return 'grey-7'
    }

    const dependencyStatusLabel = (status: ConfigurationDependencyService['status']) => {
      if (status === 'up') {
        return 'Connecté'
      }

      if (status === 'down') {
        return 'Indisponible'
      }

      return 'Inconnu'
    }

    const frameworkRows = computed(() => {
      const frameworks = apiConfig.value?.frameworks
      if (!frameworks) {
        return []
      }

      return [
        { id: 'node', component: 'Runtime', package: 'Node.js', version: frameworks.node || '—' },
        { id: 'nestjs', component: 'API', package: 'NestJS', version: frameworks.api.nestjs || '—' },
        { id: 'mongoose', component: 'API', package: 'Mongoose (driver)', version: frameworks.api.mongoose || '—' },
        { id: 'ioredis', component: 'API', package: 'ioredis (driver)', version: frameworks.api.ioredis || '—' },
        { id: 'bullmq', component: 'API', package: 'BullMQ', version: frameworks.api.bullmq || '—' },
        { id: 'express', component: 'API', package: 'Express (Nest)', version: frameworks.api.express || '—' },
        { id: 'ts-api', component: 'API', package: 'TypeScript', version: frameworks.api.typescript || '—' },
        { id: 'nuxt', component: 'Web', package: 'Nuxt', version: frameworks.web.nuxt || '—' },
        { id: 'vue', component: 'Web', package: 'Vue', version: frameworks.web.vue || '—' },
        { id: 'quasar', component: 'Web', package: 'Quasar', version: frameworks.web.quasar || '—' },
        { id: 'ts-web', component: 'Web', package: 'TypeScript', version: frameworks.web.typescript || '—' },
      ]
    })

    const dockerVolumeColumns = [
      { name: 'status', label: 'État', field: 'status', align: 'left' as const },
      { name: 'category', label: 'Portée', field: 'category', align: 'left' as const },
      { name: 'label', label: 'Volume', field: 'label', align: 'left' as const },
      { name: 'mountPoint', label: 'Point de montage', field: 'mountPoint', align: 'left' as const },
      { name: 'source', label: 'Source hôte', field: 'source', align: 'left' as const },
      { name: 'composeHint', label: 'Compose attendu', field: 'composeHint', align: 'left' as const },
    ]

    const dockerVolumeRows = computed(() => apiConfig.value?.container?.volumes || [])

    const inactiveVolumeCount = computed(() => {
      return dockerVolumeRows.value.filter((volume) => volume.status === 'inactive' && volume.required).length
    })

    const dockerMetadataRows = computed(() => {
      const docker = apiConfig.value?.container?.docker
      if (!docker) {
        return []
      }

      const labelPreview = Object.entries(docker.labels || {})
        .slice(0, 4)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ')

      return [
        { label: 'Conteneur', value: docker.name || '—' },
        { label: 'Image', value: docker.image || '—' },
        {
          label: 'Source inspection',
          value: docker.inspectSource === 'docker-api' ? 'Docker API (socket)' : 'mountinfo (fallback)',
        },
        {
          label: 'Socket Docker',
          value: docker.socketAvailable ? 'Accessible (lecture seule)' : 'Indisponible',
        },
        ...(docker.inspectDetail ? [{ label: 'Détail inspection', value: docker.inspectDetail }] : []),
        { label: 'Labels Docker', value: labelPreview || '—' },
      ]
    })

    const volumeCategoryColor = (category: 'api' | 'web' | 'shared') => {
      if (category === 'api') {
        return 'indigo-7'
      }

      if (category === 'web') {
        return 'teal-7'
      }

      return 'blue-grey-8'
    }

    const volumeCategoryLabel = (category: 'api' | 'web' | 'shared') => {
      if (category === 'api') {
        return 'API'
      }

      if (category === 'web') {
        return 'Web'
      }

      return 'Partagé'
    }

    const envColumns = [
      { name: 'key', label: 'Variable', field: 'key', align: 'left' as const, sortable: true },
      { name: 'scope', label: 'Portée', field: 'scope', align: 'left' as const },
      { name: 'value', label: 'Valeur', field: 'value', align: 'left' as const },
    ]

    const envRows = computed((): MergedEnvironmentRow[] => {
      const apiVars = apiConfig.value?.environment?.api || []
      const webVars = webConfig.value?.environment?.web || []
      const merged = new Map<string, MergedEnvironmentRow>()

      for (const entry of apiVars) {
        merged.set(entry.key, {
          id: `env-${entry.key}`,
          key: entry.key,
          value: entry.value,
          scope: 'API',
          sensitive: entry.sensitive,
        })
      }

      for (const entry of webVars) {
        const existing = merged.get(entry.key)

        if (!existing) {
          merged.set(entry.key, {
            id: `env-${entry.key}`,
            key: entry.key,
            value: entry.value,
            scope: 'Web',
            sensitive: entry.sensitive,
          })
          continue
        }

        const sameValue = existing.value === entry.value
        merged.set(entry.key, {
          ...existing,
          scope: sameValue ? 'API + Web' : 'API + Web',
          value: sameValue ? existing.value : `API: ${existing.value} / Web: ${entry.value}`,
          sensitive: existing.sensitive || entry.sensitive,
        })
      }

      return [...merged.values()].sort((a, b) => a.key.localeCompare(b.key))
    })

    const scopeColor = (scope: EnvScope) => {
      if (scope === 'API') {
        return 'indigo-7'
      }

      if (scope === 'Web') {
        return 'teal-7'
      }

      return 'blue-grey-8'
    }

    const resolvedConfigJson = computed(() => {
      if (!apiConfig.value?.resolvedConfig) {
        return ''
      }

      return JSON.stringify(apiConfig.value.resolvedConfig, null, 2)
    })

    return {
      pending,
      errorMessage,
      refreshAll,
      apiConfig,
      summaryCards,
      containerRows,
      processColumns,
      processRows,
      dependencyColumns,
      dependencyRows,
      dependencyStatusColor,
      dependencyStatusLabel,
      frameworkColumns,
      frameworkRows,
      dockerVolumeColumns,
      dockerVolumeRows,
      inactiveVolumeCount,
      dockerMetadataRows,
      volumeCategoryColor,
      volumeCategoryLabel,
      envColumns,
      envRows,
      scopeColor,
      resolvedConfigJson,
    }
  },
})
</script>

<style scoped>
.config-json {
  margin: 0;
  padding: 12px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.04);
  font-size: 12px;
  line-height: 1.45;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.text-break {
  word-break: break-all;
}

.summary-card {
  overflow: hidden;
}

.summary-card-section {
  overflow: hidden;
}

.summary-card-content {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
}

.summary-card-line {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}
</style>
