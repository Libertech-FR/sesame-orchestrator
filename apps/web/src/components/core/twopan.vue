<template lang="pug">
q-splitter.fit.q-custom-splitter.absolute.q-pa-sm(
  v-model="splitterModel"
  :horizontal='isSimple'
  :background-color="backgroundColor"
  :limits="!isSimple ? limits : [0, 100]"
  :separator-style="!isSimple ? 'width: 6px' : ''"
  :style='{minHeight: !isSimple ? "inherit" : "initial"}'
)
  template(#before)
    q-card.full-height.flex.column(:class='{ "hidden": isSimple && targetId }' style='min-height: inherit; border-right: none;' flat bordered)
      q-bar.bg-transparent.border-bottom(v-if='tableTitle')
        q-toolbar-title(v-text="tableTitle")
      slot(name="top-table")
      q-table.sesame-sticky-last-column-table.full-height.sesame-sticky-thead.sesame-bordered-table(
        ref="table"
        @request="onRequestEvent($event)"
        v-bind="$attrs"
        v-model:pagination="pagination"
        :loading="loading"
        :selection="selection"
        v-model:selected="selected"
        :rows="rows"
        :columns="parsedColumns"
        :row-key="rowKey"
        :rows-per-page-options="rowsPerPageOptions"
        :visible-columns="visibleColumnsInternal"
        :no-route-fullscreen-exit='true'
        rows-per-page-label="Lignes par page"
        no-data-label="Aucune donnée"
        loading-label="Chargement..."
        no-results-label="Aucun résultat"
        :pagination-label="(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`"
        :selected-rows-label="(numberOfRows) => `${numberOfRows} entrée(s) sélectionnée(s)`"
        dense flat binary-state-sort
      )
        template(v-slot:top="props")
          slot(name="before-top" v-bind="{ ...props, selected, clearSelection }")
            slot(name="before-top-left" v-bind="{ ...props, selected, clearSelection }")
            q-space
            slot(name="before-top-right" v-bind="{ ...props, selected, clearSelection }")
              q-btn-group(flat stretch)
                slot(name="before-top-right-before" v-bind="{ ...props, selected, clearSelection }")
                q-btn(flat icon="mdi-table-headers-eye" dense size="md")
                  q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Afficher/cacher des colonnes
                  q-menu(max-width="350px" max-height="350px").q-pa-md
                    .row
                      .col-6(v-for="column in columns" :key="column.value")
                        q-toggle.q-mb-sm(v-model='visibleColumnsInternal' :label="column.label" :val="column.name" dense)
                q-btn(v-if='!hideTwoPanSwitch' v-show='!isSimple || forceSimple' @click='forceSimple = !isSimple' :icon='isSimple ? "mdi-table-border" : "mdi-table-split-cell"' flat square dense)
                  q-tooltip.text-body2(v-if='isSimple' transition-show="scale" transition-hide="scale") Activer le mode deux panneaux
                  q-tooltip.text-body2(v-else transition-show="scale" transition-hide="scale") Désactiver le mode deux panneaux
                q-btn(@click='refresh' icon='mdi-refresh' flat square dense)
                  q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Rafraîchir les données
        template(v-for="(_, name) in $slots" v-slot:[name]="slotData")
          slot(:name="name" v-bind="slotData")
        template(v-slot:body-cell-actions="props")
          q-td(:props="props")
            q-btn-group(flat round)
              slot(name="row-actions" v-bind="props")
  template(#separator)
    q-avatar(v-if='!isSimple' size="sm" color="primary" icon="mdi-unfold-more-vertical" class="text-white")
  template(#after)
    q-card.fit.lr-sm(flat bordered v-if='!$q.screen.gt.xs')
      .flex.items-center.fit.justify-center
        div.text-center
          q-icon(name="mdi-alert-outline" color='negative' size="64px")
          div L'ecran est trop petit pour afficher les détails, tournez votre appareil en mode paysage ou changez la résolution de votre écran/la fenêtre.
    q-card.fit.gt-xs(flat bordered :style='{ borderLeft: !isSimple ? "none" : "" }')
      .flex.items-center.fit.justify-center(v-if='!targetId')
        div Selectionnez un élément pour voir ses détails ici.
      slot(name="after-content")
</template>

<script lang="ts">
import type { QTableProps } from 'quasar'

export default defineNuxtComponent({
  name: 'Twopan',
  props: {
    limits: {
      type: Array as PropType<number[]>,
      default: () => [30, 60],
    },
    tableTitle: {
      type: String,
      default: '',
    },
    backgroundColor: {
      type: String,
      default: 'primary',
    },
    simple: {
      type: Boolean,
      default: false,
    },
    loading: {
      type: Boolean,
      default: false,
    },
    hideTwoPanSwitch: {
      type: Boolean,
      default: false,
    },
    total: {
      type: Number,
      default: 0,
    },
    selection: {
      type: String as PropType<QTableProps['selection']>,
      default: 'none',
    },
    rows: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    rowPixelHeight: {
      type: Number,
      default: 33,
    },
    rowKey: {
      type: String,
      default: 'id',
    },
    refresh: {
      type: Function,
      default: () => {},
    },
    execute: {
      type: Function,
      default: () => {},
    },
    rowsPerPageOptions: {
      type: Array as PropType<QTableProps['rowsPerPageOptions']>,
      default: () => [14, 16, 20, 50, 100],
    },
    columns: {
      type: Array as PropType<QTableProps['columns']>,
      default: () => [],
    },
    visibleColumns: {
      type: Array as PropType<QTableProps['visibleColumns']>,
      default: () => [],
    },
    targetId: {
      type: String,
      required: true,
    },
    rowClassHighlight: {
      type: String,
      default: 'sesame-table-td-highlight',
    },
    rowClassHandler: {
      type: Function as PropType<(payload: { row: any; targetId: string; rowKey: string; rowClassHighlight: string }) => string>,
      default: ({ row, targetId, rowKey, rowClassHighlight }) => {
        if (`${row[rowKey]}` === targetId) {
          return rowClassHighlight
        }

        return ''
      },
    },
  },
  data() {
    return {
      selected: [] as any[],
    }
  },
  async setup(props) {
    const $q = useQuasar()
    const { pagination, onRequest, onUpdatePagination, initializePagination, updatePaginationData } = usePagination()

    const forceSimple = ref(null)
    const isSimple = computed(() => {
      if ($q.screen.lt.md) return true
      if (forceSimple.value !== null) return forceSimple.value

      return props.simple
    })

    const splitterModel = ref(40)
    if (isSimple.value) {
      splitterModel.value = 100
      if (props.targetId) {
        splitterModel.value = 0
      }
    }

    const visibleColumnsInternal = ref([...props.visibleColumns, 'actions'] as QTableProps['visibleColumns'])

    return {
      isSimple,
      forceSimple,
      splitterModel,
      pagination,
      onRequest,
      onUpdatePagination,
      initializePagination,
      updatePaginationData,
      visibleColumnsInternal,
    }
  },
  watch: {
    isSimple: {
      handler(v: boolean) {
        if (this.targetId) {
          this.splitterModel = v ? 0 : 100
        } else {
          this.splitterModel = v ? 100 : 40
        }
      },
    },
    '$q.screen.lt.md': {
      handler(v: boolean) {
        if (this.targetId) {
          this.splitterModel = 0
        } else {
          this.splitterModel = 100
        }
      },
    },
    targetId: {
      handler(t: string) {
        if (this.isSimple) {
          this.splitterModel = !t ? 100 : 0
        }
      },
    },
    total: {
      handler(total: number) {
        this.updatePaginationData({ total })
      },
      immediate: true,
    },
  },
  computed: {
    visibleColumnsSelected(): QTableProps['visibleColumns'] {
      if (!this.visibleColumns || this.visibleColumns.length === 0) {
        return (this.columns || []).map((column) => column.name)
      }

      return this.visibleColumns
    },
    parsedColumns(): QTableProps['columns'] {
      const classes: string | ((row: any) => string) = (row) => {
        return this.rowClassHandler({
          row,
          targetId: this.targetId,
          rowKey: this.rowKey,
          rowClassHighlight: this.rowClassHighlight,
        }) as string
      }

      const columns: QTableProps['columns'] =
        this.columns?.map((column) => {
          return {
            ...column,
            classes,
          }
        }) || []

      if (this.$slots.hasOwnProperty('row-actions')) {
        columns?.push({
          name: 'actions',
          label: 'Actions',
          field: 'actions',
          align: 'left',
        })
      }

      return columns
    },
  },
  methods: {
    clearSelection() {
      this.selected = []
    },
    async onRequestEvent(props: { pagination: QTableProps['pagination']; filter: string; getCellValue: Function }) {
      // console.log('onRequestEvent', props)
      await this.onRequest(props as any)
    },
  },
  async mounted() {
    const table = <{ $el?: HTMLElement }>this.$refs.table
    const internalChildren = table?.$el?.querySelector('.q-table__middle')
    const internalInnerHeight = internalChildren?.clientHeight || table?.$el?.offsetHeight || window.innerHeight

    // await this.execute()
    await this.initializePagination({
      rowPixelHeight: this.rowPixelHeight,
      internalInnerHeight,
    })
  },
})
</script>
