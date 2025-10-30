<template lang="pug">
q-page.container
  .q-px-md
    sesame-searchfilters(:fields="fieldsList")

  sesame-2pan(
    ref="twopan"
    :data="identities?.data"
    :total="identities?.total"
    :columns="columns"
    :visibleColumns="visibleColumns"
    :fieldsList="fieldsList"
    :selected="selected"
    :hide-selection="true"
    :pagination="pagination"
    :pending="pending"
    :refresh="refreshEvent"
    :error="error"
    :titleKey=["inetOrgPerson.cn"]
    :crud="crud"
    :actions="actions"
    :hide-left-buttons="true"
    :defaultRightPanelButton="false"
  )
    template(#right-panel-title-before="props")
      q-icon(name="mdi-circle" :color="getStateColor(props?.target?.state)" class="q-mr-xs")
        q-tooltip.text-body2(slot="trigger") {{ getStateName(props.target.state) }}
      q-icon(:name="getInitStateIcon(props?.target?.initState)" :color="getInitStateColor(props?.target?.initState)" class="q-mr-xs")
        q-tooltip.text-body2(slot="trigger") {{ getInitStateName(props.target.initState) }}
    template(#top-left-btn-grp="{selectedValues}")
      sesame-table-top-left( :selected="selectedValues" @refresh="refresh" @clear="clearSelected" :total="identities?.total")
    template(#body-cell-states="props")
      sesame-table-state-col(:identity="props.row")

    template(#right-panel-content="{payload, isNew}")
      sesame-identity-form(
        :identity="{...payload.target}"
        ref="form"
        :isNew="isNew"
        @refresh="refresh"
        @submit="submit($event)"
        @sync="sync" @logs="logs"
        @refreshTarget="refreshTarget"
      )
</template>

<script lang="ts" setup>
import usePagination from '~/composables/usePagination'
import { ref, provide, watch, computed } from 'vue'
import { useFetch, useRoute, useRouter } from 'nuxt/app'
import { useQuasar } from 'quasar'
import type { QTableProps } from 'quasar'
import type { components, operations } from '#build/types/service-api'
import { useErrorHandling } from '#imports'
import { useIdentityStates, useIdentityInitStates } from '~/composables'
import { identity } from '@vueuse/core'
import { useIdentityStateStore } from '~/stores/identityState'
type Identity = components['schemas']['IdentitiesDto']
type Response = operations['IdentitiesController_search']['responses']['200']['content']['application/json']

const identityStateStore = useIdentityStateStore()

defineOptions({
  name: 'Identities',
})

const twopan = ref<any>(null)
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { handleError } = useErrorHandling()
const form = ref<any>(null)
const { getStateColor, getStateName } = useIdentityStates()
const { getInitStateColor, getInitStateName, getInitStateIcon } = useIdentityInitStates()

onMounted(() => {
  initializePagination(identities.value?.total)
})

async function refreshTarget(target: Identity) {
  twopan.value.read(target)
  await identityStateStore.fetchAllStateCount()
  refreshEvent()
}

const { pagination, onRequest, initializePagination } = usePagination()

const queryWithoutRead = computed(() => {
  const { read, ...rest } = route.query
  return {
    limit: pagination.value?.rowsPerPage,
    ...rest,
  }
})

const {
  data: identities,
  pending,
  refresh,
  error,
} = await useHttp<Response>('/management/identities', {
  method: 'get',
  query: queryWithoutRead,
  onResponse: () => {
    const identityStateStore = useIdentityStateStore()
    identityStateStore.fetchAllStateCount()
  },
})

if (error.value) {
  $q.notify({
    message: 'Impossible de récupérer les identités',
    type: 'negative',
  })
}

const { columns, visibleColumns, columnsType } = useColumnsIdentites()

const selected = ref([])

function clearSelected() {
  ;(twopan as any).value.clearSelected()
}

function refreshEvent() {
  refresh()
  selected.value = []
}

const crud = {
  create: false,
  read: true,
  update: true,
  delete: false,
}

async function submit(identity: Identity) {
  console.log('submit from index')
  form.value.submit()
}

async function create(identity: Identity) {
  console.log('create from index')
  form.value.create()
}

async function sync(identity: Identity) {
  console.log('sync')
  form.value.sync()
}

async function deleteIdentity(identity: Identity) {
  console.log('deleteIdentity')
  form.value.deleteIdentity()
}

function logs(identity: Identity & { _id: string }) {
  router.push(`/logs?filters[:concernedTo.id]=${identity?._id}`)
}

const actions = {
  cancel: async (row: Identity) => {
    console.log('cancel')
  },
  read: async (row, onMounted = false) => {
    if (!onMounted) pushQuery({ key: 'read', value: row._id })
    const data = await $http.get(`/management/identities/${row._id}`, {
      method: 'get',
    })
    return { ...data._data?.data }
  },
  add: async () => {
    return {
      state: IdentityState.TO_CREATE,
      additionalFields: {
        attributes: {},
        objectClasses: [],
      },
    }
  },
  onMounted: async () => {
    if (route.query.read) {
      const id = route.query.read as string
      // const row = identities.value?.data.find((row) => row._id === id)
      // if (row) {
      //   return row
      // }
      const { data } = await useHttp<Identity>(`/management/identities/${id}`, {
        method: 'get',
      })
      return { ...data.value?.data }
    }
    return null
  },
}

const fieldsList = computed(() => {
  return columns.value!.reduce((acc: { name: string; label: string; type?: string }[], column) => {
    if (visibleColumns.value!.includes(column.name) && column.name !== 'actions' && column.name !== 'states') {
      const type = columnsType.value.find((type) => type.name === column.name)?.type
      acc.push({
        name: column.name,
        label: column.label,
        type,
      })
    }
    return acc
  }, [])
})

provide('fieldsList', fieldsList.value)
</script>
