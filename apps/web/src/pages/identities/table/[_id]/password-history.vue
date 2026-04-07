<template lang="pug">
.q-pa-md
  q-card(bordered square flat style='border-bottom: none;')
    q-card-section.q-pa-none
      q-toolbar(bordered dense style="height: 28px; line-height: 28px;")
        q-toolbar-title Historique des mots de passe
        q-btn(
          icon="mdi-refresh"
          color="primary"
          flat
          round
          dense
          :loading="loading"
          :disable="loading"
          @click="refreshHistory"
        )
    q-separator
  q-table(
    flat
    bordered
    dense
    :rows="rows"
    :columns="columns"
    row-key="_id"
    binary-state-sort
    :rows-per-page-options="[5, 10, 20, 50]"
    rows-per-page-label="Lignes par page"
    v-model:pagination="pagination"
    :loading="loading"
    hide-no-data
  )
    template(#no-data)
      .q-pa-md
        q-banner(rounded dense class="bg-grey-2 text-grey-9")
          template(#avatar)
            q-icon(name="mdi-information-outline")
          div
            div(v-if="disabledByPolicy") Historique des mots de passe désactivé par la politique.
            div(v-else) Aucune entrée d'historique pour le moment.
            div.text-caption.text-grey-7
              | Les hash ne sont jamais exposés dans l'UI.
    template(#body-cell-createdAt="props")
      q-td(:props="props")
        span(v-text="$dayjs(props.row?.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()")
    template(#body-cell-source="props")
      q-td(:props="props")
        q-chip(dense size="sm" :color="getSourceColor(props.row?.source)" text-color="white" :label="getSourceLabel(props.row?.source)")
    template(#body-cell-hibp="props")
      q-td(:props="props")
        .row.items-center.q-gutter-xs
          q-chip(
            dense
            size="sm"
            :color="getHibpColor(props.row)"
            text-color="white"
            :label="getHibpLabel(props.row)"
          )
            q-tooltip.text-body2(anchor="top middle" self="bottom middle")
              span(v-text="getHibpTooltip(props.row)")
          span.text-caption.text-grey-7(v-if="props.row?.hibpLastCheckAt")
            | ({{ $dayjs(props.row.hibpLastCheckAt).format('DD/MM/YYYY HH:mm').toString() }})
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesTableIdPasswordHistoryPage',
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      loading: false,
      disabledByPolicy: false,
      rows: [] as any[],
      pagination: {
        sortBy: 'createdAt',
        descending: true,
        page: 1,
        rowsPerPage: 10,
        rowsNumber: 0,
      },
      minLoadingMs: 250,
    }
  },
  computed: {
    columns() {
      return [
        {
          name: 'createdAt',
          required: true,
          label: 'Date',
          align: 'left',
          field: (row) => row?.createdAt,
          sortable: true,
        },
        {
          name: 'source',
          label: 'Origine',
          align: 'left',
          field: (row) => row?.source,
          sortable: false,
        },
        {
          name: 'hibp',
          label: 'HIBP',
          align: 'left',
          field: () => '',
          sortable: false,
        },
        {
          name: 'expiresAt',
          label: 'Expiration',
          align: 'left',
          field: (row) => row?.expiresAt,
          sortable: false,
          format: (val) => (val ? this.$dayjs(val).format('DD/MM/YYYY').toString() : '—'),
        },
      ]
    },
  },
  mounted() {
    this.fetchHistory()
  },
  methods: {
    async refreshHistory() {
      await this.fetchHistory()
    },
    getSourceLabel(source?: string | null): string {
      switch (source) {
        case 'change':
          return 'Changement'
        case 'reset':
          return 'Réinitialisation'
        case 'force':
          return 'Forcé'
        default:
          return 'Inconnu'
      }
    },
    getSourceColor(source?: string | null): string {
      switch (source) {
        case 'change':
          return 'primary'
        case 'reset':
          return 'orange-8'
        case 'force':
          return 'negative'
        default:
          return 'grey-7'
      }
    },
    getHibpLabel(row: any): string {
      if (!row?.hibpLastCheckAt) {
        if (row?.hasHibpFingerprint === false) {
          return 'Empreinte non stockée'
        }
        return 'Non vérifié'
      }
      if (typeof row?.hibpPwnCount === 'number') {
        return row.hibpPwnCount > 0 ? `Pwned (${row.hibpPwnCount})` : 'OK'
      }
      return 'Vérifié'
    },
    getHibpColor(row: any): string {
      if (!row?.hibpLastCheckAt) {
        if (row?.hasHibpFingerprint === false) return 'orange-8'
        return 'grey-7'
      }
      if (typeof row?.hibpPwnCount === 'number') {
        return row.hibpPwnCount > 0 ? 'negative' : 'positive'
      }
      return 'grey-7'
    },
    getHibpTooltip(row: any): string {
      // `hibpPwnCount` est le nombre d'occurrences retourné par l'API HIBP "Pwned Passwords".
      // Plus le nombre est élevé, plus le mot de passe est commun/compromis.
      if (row?.hasHibpFingerprint === false) {
        return "Empreinte HIBP non stockée au moment de l'enregistrement du mot de passe, le re-check n'est pas possible pour cette entrée."
      }

      if (!row?.hibpLastCheckAt) {
        return "En attente de vérification HIBP (re-check planifié)."
      }

      if (typeof row?.hibpPwnCount === 'number') {
        if (row.hibpPwnCount > 0) {
          return `Compromis : ce mot de passe apparaît ${row.hibpPwnCount} fois dans la base HIBP (Pwned Passwords).`
        }
        return 'OK : ce mot de passe n’apparaît pas dans la base HIBP (Pwned Passwords).'
      }

      return 'Vérifié (résultat non disponible).'
    },
    async fetchHistory() {
      const loadingStartedAt = Date.now()
      this.loading = true
      this.disabledByPolicy = false

      try {
        const identityId = (this.identity as any)?._id || (this.$route.params._id as string)
        const res = await (this as any).$http.get(`/management/password-history/${identityId}`, {
          method: 'GET',
        })

        const payload = res?._data
        const data = payload?.data || []
        this.rows = Array.isArray(data) ? data : []
        this.pagination.rowsNumber = this.rows.length
        this.disabledByPolicy = typeof payload?.message === 'string' && payload.message.toLowerCase().includes('désactivé')
      } catch (error: any) {
        this.rows = []
        this.pagination.rowsNumber = 0
        this.$q.notify({
          message: "Erreur lors du chargement de l'historique des mots de passe",
          color: 'negative',
          icon: 'mdi-alert-circle-outline',
          position: 'top-right',
        })
      } finally {
        const elapsedMs = Date.now() - loadingStartedAt
        const remainingMs = this.minLoadingMs - elapsedMs
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs))
        }
        this.loading = false
      }
    },
  },
})
</script>

