<template lang="pug">
q-page.container
  //- .q-px-md
  //-   sesame-searchfilters(:fields="fieldsList")
  //-     template(#rightSelect)
  //-       div

  sesame-2pan(
    :simple="true"
    :data="agents?.data"
    :total="agents?.total"
    :columns="columns"
    :visibleColumns="visibleColumns"
    :fieldsList="fieldsList"
    :selected="selected"
    :pending="pending"
    :refresh="refreshEvent"
    :error="error"
    :titleKey=["username"]
    :crud="crud"
    :actions="actions"
    :defaultRightPanelButton="true"
    hide-pagination
    hidePanModeSwitch
  )
    //- template(#top-left)
    //- sesame-table-top-left(:selected="selected" @updateLifestep="updateLifestep($event)" @clear="selected = []")
    //- template(#body-cell-states="props")
    //-   sesame-table-state-col(:identity="props.row")
    //- template(#right-panel-actions-content-after="{target}")
    //-   sesame-identity-form-actions(:identity="target" @submit="submit($event)" @sync="sync" @logs="logs")
    template(#right-panel-content="{ payload }")
      //- sesame-generic-form(
      //-   :payload="payload" ref="form"
      //-   :schema="schema"
      //-   :uischema="uischema"
      //-   v-model:validations="validations"
      //- )
      sesame-json-form-renderer(
        v-model:data="payload.target"
        v-model:validations="validations"
        :schema="schema"
        :uischema="uischema"
      )
</template>

<script lang="ts" setup>
// import usePagination from '~/composables/usePagination'
import useAgentsSchema from '~/composables/useAgentsSchema'
import { ref, provide, watch, computed } from 'vue'
import { useFetch, useRoute, useRouter } from 'nuxt/app'
import { useQuasar } from 'quasar'
import type { QTableProps } from 'quasar'
import type { components, operations } from '#build/types/service-api'
import { useErrorHandling } from '#imports'
type Agent = components['schemas']['AgentsDto']
type Response = operations['AgentsController_search']['responses']['200']['content']['application/json']

defineOptions({
  name: 'Agents',
})

const agentsSchema = useAgentsSchema()
const schema = agentsSchema.schema
const uischema = agentsSchema.uischema
const validations = ref([])

const daysjs = useDayjs()
const route = useRoute()
const router = useRouter()
const $q = useQuasar()
const { handleError } = useErrorHandling()
const form = ref<any>(null)

// onMounted(() => {
//   // initializePagination(agents.value?.total)
// })

// const { pagination, onRequest, initializePagination } = usePagination()

// const queryWithoutRead = computed(() => {
//   const { read, ...rest } = route.query
//   return rest
// })

const {
  data: agents,
  pending,
  refresh,
  error,
} = await useHttp<Response>('/core/agents', {
  method: 'get',
  query: {
    limit: 99999,
  },
})

if (error.value) {
  $q.notify({
    message: 'Impossible de récupérer les agents',
    type: 'negative',
  })
}

const columns = ref<QTableProps['columns']>([
  {
    name: 'username',
    label: 'Nom d\'utilisateur',
    field: (row: Agent) => row.username,
    align: 'left',
    sortable: true,
  },
  {
    name: 'email',
    label: 'Email',
    field: (row: Agent) => row.email,
    align: 'left',
    sortable: true,
  },
  {
    name: 'actions',
    label: 'Actions',
    field: 'actions',
    align: 'left',
  },
])
const visibleColumns = ref<QTableProps['visibleColumns']>([
  'username',
  'email',
  'actions',
])
const columnsType = ref([
  { name: 'username', type: 'text' },
  { name: 'email', type: 'text' },
  { name: 'actions', type: 'text' },
  { name: 'actions', type: 'text' },
  { name: 'actions', type: 'text' },
])

const selected = ref([])

function refreshEvent() {
  refresh()
  selected.value = []
}

const crud = {
  create: true,
  read: true,
  update: true,
  delete: true,
}

async function submit(agent: Agent) {
  console.log('submit from index')
  form.value.submit()
}

async function sync(agent: Agent) {
  console.log('sync')
  form.value.sync()
}

function logs(agent: Agent) {
  console.log('logs')
}

const actions = {
  cancel: async (row: Agent) => {
    console.log('cancel')
    validations.value = {}
  },
  create: async (row: Agent) => {

    // console.log('row', row)

    const sanitizedAgent = { ...row }
    delete sanitizedAgent.metadata

    const { data: result, pending, error, refresh } = await useHttp(`/core/agents`, {
      method: 'POST',
      body: { ...sanitizedAgent },
    });
    if (error.value) {
      handleError({
        error: error.value,
        message: 'Erreur lors de la création'
      })
      validations.value = error.value.data.validations
    } else {
      $q.notify({
        message: 'Création effectuée',
        color: 'positive',
        position: 'top-right',
        icon: 'mdi-check-circle-outline',
      })
      return row
    }
  },
  update: async (row: Agent) => {
    const sanitizedAgent = { ...row }
    delete sanitizedAgent.metadata

    const { data: result, pending, error, refresh } = await useHttp(`/core/agents/${row._id}`, {
      method: 'PATCH',
      body: sanitizedAgent,
    });
    if (error.value) {
      handleError({
        error: error.value,
        message: 'Erreur lors de la sauvegarde'
      })
      validations.value = error.value.data.validations
    } else {
      $q.notify({
        message: 'Sauvegarde effectuée',
        color: 'positive',
        position: 'top-right',
        icon: 'mdi-check-circle-outline',
      })
    }
    return row
  },
  delete: async (row: Agent) => {
    $q.dialog({
      dark: true,
      title: 'Suppresion d\'un l\'agent',
      message: `Vous êtes sur le point de supprimer l\'agent <b>${row.username}</b>. Êtes-vous sûr ?`,
      persistent: true,
      html: true,
      ok: {
        push: true,
        color: 'negative',
        label: 'Supprimer',
      },
      cancel: {
        push: true,
        color: 'grey-8',
        label: 'Annuler',
      },
    }).onOk(async () => {
      const { data: result, pending, error, refresh } = await useHttp(`/core/agents/${row._id}`, {
        method: 'DELETE',
      });
      if (error.value) {
        handleError({
          error: error.value,
          message: 'Erreur lors de la suppression',
        })
        validations.value = error.value.data.validations
      } else {
        $q.notify({
          message: 'Suppression effectuée',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
      }

    })
    return row
  },
  read: async (row, onMounted = false) => {
    if (!onMounted) pushQuery({ key: 'read', value: row._id })
    const { data } = await useHttp<Agent>(`/core/agents/${row._id}`, {
      method: 'get',
    })
    validations.value = {}
    return data.value?.data
  },
  onMounted: async () => {
    if (route.query.read) {
      const id = route.query.read as string

      const { data } = await useHttp<Agent>(`/core/agents/${id}`, {
        method: 'get',
      })
      return data.value?.data
      // const row = agents.value?.data.find((row) => row._id === id)
      // if (row) {
      //   return row
      // }
    }
    return null
  }

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
