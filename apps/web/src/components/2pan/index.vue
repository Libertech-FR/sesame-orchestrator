<template lang="pug">
q-splitter(
  v-model="splitterModel"
  separator-style="width: 8px"
  background-color="primary"
  class="full-height"
  :limits="!isSimple ? [30,70] : [0,100]"
  :horizontal='isSimple'
  :style='{ "padding": isSimple ? "6px 0" : "0" }'
)
  template(#before)
    q-card.full-height.q-pa-sm(bordered :class='{"hidden": isSimple && targetId}')
      q-table.sesame-sticky-last-column-table.full-height(
        v-bind="$attrs"
        :selection="selectedIsHidden()"
        v-model:selected="selected"
        v-model:pagination="pagination"
        :hide-pagination="hidePagination"
        :rows="data"
        :visible-columns="visibleColumnsInternal"
        :row-key="rowKey"
        @request="onRequest($event, props.total)"
        :rows-per-page-options="[12, 16, 20,50,0]"
        :columns="cols"
        :loading="pending"
        rows-per-page-label="Lignes par page"
        no-data-label="Aucune donnée"
        loading-label="Chargement..."
        no-results-label="Aucun résultat"
        :pagination-label="(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`"
        :selected-rows-label="(numberOfRows) => `${numberOfRows} entrée(s) sélectionnée(s)`"
        flat dense
      )
        template(v-for="(_, name) in $slots" v-slot:[name]="slotData")
          slot(:name="name" v-bind="slotData")
        template(v-slot:top-left v-if="hideLeftButtons === false")
          q-btn-group( rounded flat)
            slot(name="top-left-btn-grp" :selectedValues="selected")
              slot(name="top-left-btn-grp-content-before")
              slot(name="top-left-btn-grp-content-after")
        template(v-slot:top-right v-if="hideRightButtons === false")
          q-btn-group(rounded flat)
            slot(name="top-right-btn-grp")
              slot(name="top-right-btn-grp-content-before")
              sesame-2pan-btns-add(@add="add" v-if="crud.create")
              q-btn.desktop-only(v-if="!hidePanModeSwitch" flat :icon="isSimple ? 'mdi-table-border' : 'mdi-table-merge-cells'" color="info" @click="simple = !simple")
                q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Mode simple/double panneaux
              q-btn(flat icon="mdi-table-headers-eye" color="info")
                q-tooltip.text-body2(transition-show="scale" transition-hide="scale") Afficher/cacher des colonnes
                q-menu(max-width="350px" max-height="350px").q-pa-md
                  .row
                    .col-6(v-for="column in columns" :key="column.value")
                      q-toggle(v-model='visibleColumnsInternal' :label="column.label" :val="column.name")
              sesame-2pan-btns-refresh(@refresh="refresh")
              slot(name="top-right-btn-grp-content-after")

        template(v-slot:body-cell-actions="props")
          q-td(:props="props")
            q-btn-group(flat rounded)
              slot(name="body-cell-actions" :props="props")
                slot(name="body-cell-actions-content-before")
                sesame-2pan-btns-read(@read="read(props.row)" v-if="crud.read")
                sesame-2pan-btns-remove(@remove="remove(props.row)" v-if="crud.delete")
                slot(name="body-cell-actions-content-after")

  template(#separator)
    q-avatar(v-if='!isSimple' size="sm" color="primary" icon="mdi-unfold-more-vertical" class="text-white")

  template(#after)
    q-card.full-height.q-pa-none(bordered :class='{"hidden": isSimple && !targetId}')
      q-card-section.q-pa-none.flex.items-center.full-height.justify-center(v-if='!targetId')
        slot(name="right-panel-empty")
          slot(name="right-panel-empty-content-before")
          p Selectionnez une entrée pour afficher son contenu...
          slot(name="right-panel-empty-content-after")
      div.full-height.q-pa-none.flex.justify-start(v-else style='flex-flow: column; overflow-y: auto;')
        q-toolbar.q-py-none(style='height: 50px;')
          q-btn(color="primary" icon="mdi-chevron-left" @click="cancel" tooltip="Retour" dense)
            q-tooltip.text-body2 Retour
          q-separator.q-mx-sm(vertical)
          slot(name="right-panel-title" :target="target")
            slot(name="right-panel-title-before" :target="target")
            q-toolbar-title(v-html=`isNew ? defaultTitle : getTitle` style='flex: 100 1 0%')
            slot(name="right-panel-title-after" :target="target")
          q-space
          slot(name="right-panel-actions")
            slot(name="right-panel-actions-content-before" :target="target")
            slot(name="right-panel-actions-content" v-if="defaultRightPanelButton" :target="target" :isNew="isNew" :crud="crud")
              q-btn(color="positive" icon='mdi-content-save-plus' @click="create(target)" v-show="isNew" v-if="crud.create")
                q-tooltip.text-body2 Créer
              q-btn(color="positive" icon='mdi-content-save' @click="update(target)" v-show="!isNew" v-if="crud.update")
                q-tooltip.text-body2 Enregistrer
              q-btn(color="negative" icon='mdi-delete' @click="remove(target)" v-show="!isNew" v-if="crud.delete")
                q-tooltip.text-body2 Supprimer
            slot(name="right-panel-actions-content-after" :target="target" :isNew="isNew" :crud="crud")
        q-card-section.q-pa-none.fit.flex(style='flex-flow: column; overflow: hidden;')
          slot(name="right-panel-content" :payload="{ target }" :isNew="isNew")
            slot(name="right-panel-content-before")
            slot(name="right-panel-content-after")
        q-expansion-item.bg-blue-grey-10(v-if='debug' label='Debug' icon='mdi-bug' dark dense)
          .outer-ne-resize(:style='{minHeight: "250px", height: "250px"}')
            q-card.overflow-auto.bg-blue-grey-8.text-white.inner-ne-resize
              q-card-section.q-pa-xs
                pre.q-ma-none(v-html='JSON.stringify(target, null, 2)')
</template>

<script lang="ts" setup>
import { computed, useDayjs } from '#imports'
import { useRoute, useRouter } from 'nuxt/app'
import { ref, watch } from 'vue'
import type { QTableProps } from 'quasar'
import { useResizeObserver } from '@vueuse/core'
// import type { components } from '#build/types/service-api'
import type { PropType } from 'vue'
import { crush, pick } from 'radash'
import { routerKey } from 'vue-router'

const NEW_ID = '000000000000000000000000'

defineOptions({
  name: '2pan',
})

const $q = useQuasar()
const router = useRouter()

const props = defineProps({
  simple: {
    type: Boolean,
    default: false,
  },
  hideSelection: {
    type: Boolean,
    default: false,
  },
  hideLeftButtons: {
    type: Boolean,
    default: false,
  },
  hideRightButtons: {
    type: Boolean,
    default: false,
  },
  hidePagination: {
    type: Boolean,
    default: false,
  },
  hidePanModeSwitch: {
    type: Boolean,
    default: false,
  },
  rowKey: {
    type: String,
    default: '_id',
  },
  visibleColumns: {
    type: Array as PropType<QTableProps['visibleColumns']>,
    default: () => [],
  },
  titleKey: {
    type: Array as PropType<string[]>,
    default: ['name'],
  },
  data: {
    type: Array as PropType<any[]>,
    default: () => [],
  },
  columns: {
    type: Array as PropType<QTableProps['columns']>,
    default: () => [],
  },
  pending: {
    type: Boolean,
    default: false,
  },
  refresh: {
    type: Function,
    default: () => {},
  },
  total: {
    type: Number,
    default: 16,
  },
  defaultRightPanel: {
    type: Boolean,
    default: true,
  },
  defaultRightPanelButton: {
    type: Boolean,
    default: true,
  },
  rightPanelStyle: {
    type: Object as PropType<Partial<CSSStyleDeclaration>>,
    default: () => ({}),
  },
  crud: {
    type: Object as PropType<{
      create: boolean
      read: boolean
      update: boolean
      delete: boolean
    }>,
    default: () => ({
      create: false,
      read: true,
      update: false,
      delete: false,
    }),
  },
  actions: {
    type: Object as PropType<{
      create: <T>(r: T) => Promise<T>
      read: <T>(r: T) => Promise<T>
      update: <T>(r: T) => Promise<T>
      delete: <T>(r: T) => Promise<T>
      cancel: () => Promise<void>
      add: <T>() => Promise<T>
      onMounted: <T = object>() => Promise<T | null>
    }>,
    default: {
      create: async <T,>(row: T) => {
        return row
      },
      read: async <T,>(row: T) => {
        return row
      },
      update: async <T,>(row: T) => {
        return row
      },
      delete: async <T,>(row: T) => {
        return row
      },

      cancel: async () => {},
      add: async () => {
        return {}
      },
      onMounted: async () => {},
    },
  },
})

const defaultTitle = "<span class='text-grey-8'>Création d'un nouveau élément</span>"
const simple = ref(props.simple)
const isSimple = computed(() => {
  if ($q.platform.is.mobile) return true
  return simple.value
})
watch(simple, (v) => {
  splitterModel.value = v ? 100 : 75
})
const splitterModel = ref(isSimple.value ? 100 : 50)

const leftBtnHidden = computed(() => {
  return isSimple.value || splitterModel.value > 40
})

const visibleColumnsInternal = ref(props.visibleColumns)
const visibleColumnsComputed = computed({
  get() {
    return visibleColumnsInternal.value
  },
  set(value) {
    visibleColumnsInternal.value = value
  },
})

const cols = computed(() => {
  return props.columns?.map((c) => {
    return {
      ...c,
      classes: (row) => highlightRow(row[props.rowKey]),
    }
  })
})

const route = useRoute()
const { pagination, onRequest, initializePagination } = usePagination()
initializePagination(props.total)

watch(
  () => props.data,
  async () => {
    if (pagination.value) {
      pagination.value.rowsNumber = props.total
    }
  },
)

const emit = defineEmits(['create', 'refresh', 'read', 'update', 'delete'])
const { debug } = useDebug()

const selected = ref([])
const tab = ref('')
const targetId = ref<null | string>(route.query?.read ? `${route.query?.read}` : null)
const target = ref<object>({})
const daysjs = useDayjs()

watch(target, (t) => {
  // if (t) selected.value = [t]
  if (isSimple) {
    splitterModel.value = !t ? 100 : 0
  }
})

function highlightRow(rowKey) {
  if (!target.value) return ''
  if (target.value[props.rowKey] === rowKey) {
    return 'sesame-table-td-highlight'
  }
}
function selectedIsHidden() {
  if (props.hideSelection === false) {
    return 'multiple'
  } else {
    return 'none'
  }
}

async function refresh() {
  await props.refresh()
  initializePagination(props.total)
  emit('refresh')
}

async function cancel() {
  await props.actions.cancel()
  targetId.value = null
  target.value = {}
  selected.value = []
  await router.push({ query: { ...route.query, read: null } })
}
async function read(row) {
  targetId.value = row?._id
  const response = await props.actions.read(row)
  target.value = { ...response }
  emit('read', response)
}

async function add() {
  const read = NEW_ID
  targetId.value = read
  target.value = (await props.actions.add()) || {}
  await router.push({ query: { ...route.query, read } })
}

async function create(row) {
  console.log('create', row)
  const response = await props.actions.create(row)
  console.log('response', response)
  // target.value = response
  // targetId.value = response?._id
  emit('create', response)
  if (response) cancel()
}

async function update(row) {
  targetId.value = row?._id
  const response = await props.actions.update(row)
  target.value = { ...response }
  emit('update', response)
}

async function remove(row) {
  // targetId.value = row?._id
  const response = await props.actions.delete(row)
  target.value = response
  // target.value = response
  emit('delete', response)
}

const isNew = computed(() => {
  return targetId.value === NEW_ID
})

const getTitle = computed(() => {
  const keys = Array.isArray(props.titleKey) ? props.titleKey : [props.titleKey]
  if (!target.value) return ''
  const crushed = crush(target.value)
  const valuesList = target.value ? pick(crushed, keys as any) : {}
  return Object.values(valuesList).join(' ')
})

function clearSelected() {
  selected.value = []
}

defineExpose({
  cancel,
  create,
  read,
  update,
  remove,
  refresh,
  selected,
  clearSelected,
})

onMounted(async () => {
  if (isNew.value) {
    await add()
    return
  }
  const newTarget = await props.actions.onMounted()
  // console.log('newTarget', newTarget)
  if (newTarget) {
    target.value = { ...newTarget }
    targetId.value = (newTarget as any)?._id
  }
})
</script>

<style></style>
