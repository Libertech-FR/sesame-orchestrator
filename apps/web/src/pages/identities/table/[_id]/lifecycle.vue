<template lang="pug">
.column.no-wrap.fit(style='height: 100%; overflow: hidden;')
  div(style='position: sticky; top: 0; z-index: 1; flex: 0 0 auto;')
      q-toolbar(:class='[$q.dark.isActive ? "bg-dark" : "bg-white"]')
        q-toolbar-title Historique des cycles de vie
        q-select.col-4(
          v-model="lifecyclesBy"
          :options="lifecyclesByOptions"
          label="Regrouper par"
          emit-value
          map-options
          outlined
          dense
        )
      q-separator
  .col.relative-position(style='min-height: 0;')
    q-infinite-scroll.fit.q-px-lg(@load="load" :offset="250")
      template(#loading)
        .absolute-full.row.justify-center.items-center
          q-spinner-dots(color="primary" size="40px")
      .q-gutter-md.q-pt-md(v-if="computedLifecyclesByGroups.length > 0")
        template(v-for="group in computedLifecyclesByGroups" :key="group.key")
          .text-body2.text-grey-7.text-weight-medium {{ group.label }} ({{ group.count }})
          q-timeline(layout="dense")
            q-timeline-entry(
              v-for="lifecycle in group.items"
              :key="lifecycle._id"
              :icon="getLifecycleIcon(lifecycle.lifecycle)"
              :style="getLifecycleTimelineIconStyle(lifecycle)"
              class="lifecycle-entry"
            )
              .row.items-center.no-wrap.q-gutter-xs
                q-card(flat bordered class="q-px-sm q-py-xs" :style="getLifecycleCardStyle(lifecycle)")
                  .row.items-center.no-wrap
                    q-chip.text-white.q-pa-sm(
                      dense
                      size="sm"
                      :style="getLifecycleChipStyle(lifecycle)"
                    )
                      span {{ getLifecycleName(lifecycle.lifecycle) }}
                    .text-body2.no-wrap {{ getLifecycleAnnouncement(lifecycle) }}
                .row.items-center.no-wrap.text-caption.text-grey-7
                  q-icon(name="mdi-clock-outline" size="16px" class="q-mr-xs")
                  span {{ formatLifecycleDate(lifecycle) }}
                q-space
                q-btn(
                  dense
                  flat
                  round
                  icon="mdi-magnify"
                  color="grey-7"
                  aria-label="Voir le détail de l'event"
                  @click.stop="openLifecycleDetails(lifecycle)"
                )
                  q-tooltip.text-body2(anchor='top middle' self="bottom middle") Voir le détail de l'événement
            q-timeline-entry(
              :key="`${group.key}-end-dot`"
              color="grey-5"
              class="lifecycle-end-entry"
            )
      q-banner.text-negative.text-center(v-if="empty" dense icon="mdi-flag-off" class="q-my-md")
        | Fin de la liste ({{ lifecycles.length }} événement{{ lifecycles.length > 1 ? 's' : '' }}).

  q-dialog(v-model="lifecycleDetailsDialogOpen" maximized)
    q-card.audit-diff-card
      q-toolbar.bg-orange-8.text-white(dense style="height: 28px; line-height: 28px;")
        q-toolbar-title Détails événement cycle de vie
        q-space
        q-btn(icon="mdi-close" flat round dense v-close-popup aria-label="Fermer")
      q-bar.bg-transparent(dense style="height: 28px; line-height: 28px;")
        q-chip(
          v-if="lifecycleDetailsMeta.lifecycleLabel"
          dense
          size="sm"
          :color="lifecycleDetailsMeta.lifecycleColor"
          :text-color="lifecycleDetailsMeta.lifecycleTextColor"
          :icon="lifecycleDetailsMeta.lifecycleIcon"
        )
          span {{ lifecycleDetailsMeta.lifecycleLabel }}
        q-space
        .text-caption.text-grey-7
          span(v-if="lifecycleDetailsMeta.actor") Par: {{ lifecycleDetailsMeta.actor }}
          span(v-if="lifecycleDetailsMeta.actor && lifecycleDetailsMeta.date")  -
          span(v-if="lifecycleDetailsMeta.date") Le: {{ lifecycleDetailsMeta.date }}
      q-separator
      .q-pa-md.row.justify-center(v-if="lifecycleDetailsLoading")
        q-spinner-dots(color="primary" size="40px")
      q-banner.bg-warning.text-black(v-if="!lifecycleDetailsLoading && !lifecycleDetailsJson")
        | Aucun détail exploitable trouvé pour cet événement.
      .audit-diff-editor(v-else-if="!lifecycleDetailsLoading")
        LazyMonacoEditor(
          style="height: 100%; width: 100%"
          lang="json"
          :model-value="lifecycleDetailsJson"
          :options="monacoOptions"
        )
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesIdLifecycleHistoryPage',
  props: {
    identity: Object,
  },
  data() {
    return {
      lifecyclesByOptions: [
        { label: 'Jour', value: 'DD/MM/YYYY' },
        { label: 'Mois', value: 'MM/YYYY' },
        { label: 'Année', value: 'YYYY' },
      ],
    }
  },
  async setup() {
    const { monacoOptions } = useDebug()
    const { getLifecycleColor, getLifecycleName, getLifecycleIcon, getLifecycleInfos } = await useIdentityLifecycles()

    const scrollTargetRef = ref(null)
    const tabs = ref([])

    const $route = useRoute()
    const $router = useRouter()
    const $dayjs = useDayjs()

    const offset = ref(0)

    const lifecyclesBy = computed({
      get: () => ($route.query.lifecyclesBy ? `${$route.query.lifecyclesBy}` : undefined),
      set: (value) => {
        $router.replace({
          query: {
            ...$route.query,
            lifecyclesBy: value,
          },
        })
      },
    })
    if (!lifecyclesBy.value) {
      lifecyclesBy.value = 'DD/MM/YYYY'
    }

    const empty = ref(false)
    const lifecycles = ref<any>([])

    const lifecycleDetails = ref<any>(null)
    const lifecycleDetailsDialogOpen = ref(false)
    const lifecycleDetailsLoading = ref(false)
    const lifecycleDetailsJson = computed(() => {
      if (!lifecycleDetails.value) return ''
      try {
        return JSON.stringify(lifecycleDetails.value, null, 2)
      } catch {
        return ''
      }
    })
    const lifecycleDetailsMeta = reactive({
      actor: '',
      date: '',
      lifecycleLabel: '',
      lifecycleColor: 'grey',
      lifecycleTextColor: 'white',
      lifecycleIcon: 'mdi-help-rhombus-outline',
    })

    function getLifecycleCreatedAt(lifecycle: any): Date | null {
      return lifecycle?.metadata?.createdAt || lifecycle?.date || null
    }

    function formatLifecycleDate(lifecycle: any): string {
      const createdAt = getLifecycleCreatedAt(lifecycle)
      if (!createdAt) return ''
      return $dayjs(createdAt).format('DD/MM/YYYY HH:mm:ss').toString()
    }

    function getLifecycleActor(lifecycle: any): string {
      const metadata = lifecycle?.metadata || {}
      const actorCandidate = metadata.updatedBy || metadata.createdBy || metadata.author || metadata.actor || lifecycle?.refId?.inetOrgPerson?.uid

      if (typeof actorCandidate === 'string' && actorCandidate.trim()) return actorCandidate
      if (actorCandidate?.uid) return actorCandidate.uid
      if (actorCandidate?.name) return actorCandidate.name
      if (actorCandidate?.email) return actorCandidate.email
      return 'Système'
    }

    function getLifecycleAnnouncement(lifecycle: any): string {
      const lifecycleName = getLifecycleName(lifecycle?.lifecycle) || lifecycle?.lifecycle || 'Inconnu'
      const by = getLifecycleActor(lifecycle)
      return `Définition du cycle de vie ${lifecycleName} par ${by}.`
    }

    function resolveLifecycleColor(color?: string): string {
      if (!color) return 'var(--q-grey)'
      return color.startsWith('#') ? color : `var(--q-${color})`
    }

    function getLifecycleCardStyle(lifecycle: any): Record<string, string> {
      const resolvedColor = resolveLifecycleColor(getLifecycleColor(lifecycle?.lifecycle))

      return {
        borderLeft: `4px solid ${resolvedColor}`,
      }
    }

    function getLifecycleChipStyle(lifecycle: any): Record<string, string> {
      const lifecycleInfos = getLifecycleInfos(lifecycle?.lifecycle)
      const backgroundColor = resolveLifecycleColor(getLifecycleColor(lifecycle?.lifecycle))
      const textColor = resolveLifecycleColor(lifecycleInfos?.textColor || 'white')

      return {
        backgroundColor,
        color: textColor,
      }
    }

    function getLifecycleTimelineIconStyle(lifecycle: any): Record<string, string> {
      const resolvedColor = resolveLifecycleColor(getLifecycleColor(lifecycle?.lifecycle))

      return {
        '--lifecycle-timeline-color': resolvedColor,
      }
    }

    const computedLifecyclesByGroups = computed(() => {
      const map = new Map<string, { key: string, items: any[], representativeAt: Date | null }>()

      lifecycles.value.forEach((lifecycle: any) => {
        const createdAt = getLifecycleCreatedAt(lifecycle)
        if (!createdAt) return

        const key = $dayjs(createdAt).format(lifecyclesBy.value)
        if (!map.has(key)) {
          map.set(key, { key, items: [], representativeAt: createdAt })
        }
        map.get(key)!.items.push(lifecycle)
      })

      const groups = Array.from(map.values()).map((g) => {
        let label = g.key
        if (lifecyclesBy.value === 'MM/YYYY' && g.representativeAt) {
          label = $dayjs(g.representativeAt).format('MMMM YYYY')
        } else if (lifecyclesBy.value === 'DD/MM/YYYY' && g.representativeAt) {
          label = $dayjs(g.representativeAt).format('DD/MM/YYYY')
        } else if (lifecyclesBy.value === 'YYYY' && g.representativeAt) {
          label = $dayjs(g.representativeAt).format('YYYY')
        }

        const timestamp = g.representativeAt ? $dayjs(g.representativeAt).valueOf() : 0
        return { key: g.key, label, items: g.items, count: g.items.length, timestamp }
      })

      groups.sort((a, b) => b.timestamp - a.timestamp)
      return groups
    })

    const defaultOpenGroupKey = computed(() => {
      const firstMulti = computedLifecyclesByGroups.value.find((g) => g.count > 1)
      return firstMulti?.key || computedLifecyclesByGroups.value[0]?.key || null
    })

    return {
      scrollTargetRef,
      tabs,
      offset,
      // query,
      lifecyclesBy,
      empty,
      lifecycles,
      computedLifecyclesByGroups,
      defaultOpenGroupKey,
      getLifecycleColor,
      getLifecycleName,
      getLifecycleIcon,
      getLifecycleInfos,
      formatLifecycleDate,
      getLifecycleActor,
      getLifecycleAnnouncement,
      getLifecycleCardStyle,
      getLifecycleChipStyle,
      getLifecycleTimelineIconStyle,
      monacoOptions,
      lifecycleDetails,
      lifecycleDetailsDialogOpen,
      lifecycleDetailsLoading,
      lifecycleDetailsJson,
      lifecycleDetailsMeta,
    }
  },
  computed: {
    query() {
      return {
        limit: 10,
        skip: this.offset * 10,
        'sort[metadata.lastUpdatedAt]': 'desc',
        ...this.$route.query,
      }
    },
  },
  methods: {
    async load(index, done) {
      this.offset = index - 1
      const _id = this.$route.params._id as string

      try {
        const res = await (this as any).$http.get(`/management/lifecycle/identity/${_id}`, {
          query: {
            limit: 10,
            skip: this.offset * 10,
            'sort[metadata.lastUpdatedAt]': 'desc',
          },
        })

        this.lifecycles.push(...res._data.data)
        this.empty = res._data.data.length === 0
        done(res._data.data.length === 0)
      } catch (e) {
        done(true)
      }
    },
    openLifecycleDetails(lifecycle: any) {
      this.lifecycleDetails = lifecycle
      this.lifecycleDetailsDialogOpen = true
      this.lifecycleDetailsLoading = true

      try {
        const lifecycleInfos = lifecycle?.lifecycle ? this.getLifecycleInfos(lifecycle.lifecycle) : null

        this.lifecycleDetailsMeta.actor = this.getLifecycleActor(lifecycle)
        this.lifecycleDetailsMeta.date = this.formatLifecycleDate(lifecycle)
        this.lifecycleDetailsMeta.lifecycleLabel = lifecycle?.lifecycle ? this.getLifecycleName(lifecycle.lifecycle) : 'Inconnu'
        this.lifecycleDetailsMeta.lifecycleColor = lifecycle?.lifecycle ? this.getLifecycleColor(lifecycle.lifecycle) : 'grey'
        this.lifecycleDetailsMeta.lifecycleTextColor = lifecycleInfos?.textColor || 'white'
        this.lifecycleDetailsMeta.lifecycleIcon = lifecycle?.lifecycle ? this.getLifecycleIcon(lifecycle.lifecycle) : 'mdi-help-rhombus-outline'
      } catch (error) {
        this.lifecycleDetailsMeta.actor = 'Système'
        this.lifecycleDetailsMeta.date = ''
        this.lifecycleDetailsMeta.lifecycleLabel = 'Inconnu'
        this.lifecycleDetailsMeta.lifecycleColor = 'grey'
        this.lifecycleDetailsMeta.lifecycleTextColor = 'white'
        this.lifecycleDetailsMeta.lifecycleIcon = 'mdi-help-rhombus-outline'
        this.$q.notify({
          message: "Erreur lors de l'ouverture du détail de l'événement",
          color: 'negative',
          icon: 'mdi-alert-circle-outline',
          position: 'top-right',
        })
      } finally {
        this.lifecycleDetailsLoading = false
      }
    },
  },
})
</script>

<style scoped>
.audit-diff-card {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.audit-diff-editor {
  flex: 1;
  min-height: 0;
}

:deep(.lifecycle-entry .q-timeline__subtitle) {
  display: none;
}

:deep(.lifecycle-entry .q-timeline__content) {
  width: 100%;
}

:deep(.lifecycle-entry .q-timeline__dot) {
  color: var(--lifecycle-timeline-color) !important;
}

:deep(.lifecycle-entry .q-timeline__dot) {
  border-color: currentColor !important;
}

:deep(.lifecycle-entry .q-timeline__dot .q-icon) {
  color: #fff !important;
}

:deep(.lifecycle-end-entry .q-timeline__content),
:deep(.lifecycle-end-entry .q-timeline__subtitle) {
  display: none;
}

:deep(.lifecycle-end-entry) {
  min-height: 24px;
}

:deep(.q-timeline__entry--icon .q-timeline__dot:after) {
  background: var(--totl-primate-font-descolor) !important;
}
</style>
