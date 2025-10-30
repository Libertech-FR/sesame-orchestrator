<template>
  <q-page class="container">
    <!-- <pre v-html="JSON.stringify(expanded)"></pre> -->
    <div class="col-12">
      <q-btn @click="push('/jobs/table')" color="positive" glossy label=" Afficher les 1000 dernieres entrées" />
      <q-btn @click="push('/jobs/table?filters[:state]=-1')" color="negative" glossy label=" Afficher que les erreurs" />
    </div>
    <q-table flat bordered title="Journal" v-model:expanded="expanded" dense :rows="rows" :columns="columns" row-key="jobId" :rows-per-page-options="[20, 50, 0]">
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-bold">
            {{ col.label }}
          </q-th>
          <q-th> </q-th>
        </q-tr>
      </template>
      <template v-slot:body="props">
        <q-tr :props="props" :class="{ 'bg-primary': props.expand, 'text-white': props.expand }">
          <q-td v-for="col in props.cols" :key="col.name" :props="props">
            <template v-if="col.name === 'identity'">
              <q-chip
                v-if="props.row?.concernedTo?.name"
                @click="
                  open(
                    `/identities?read=${props.row?.concernedTo?.id}&filters[^inetOrgPerson.cn]=/${props.row?.concernedTo?.name}/i&skip=0&limit=16&sort[metadata.lastUpdatedAt]=desc`,
                  )
                "
                icon="mdi-account"
                clickable
                dense
              >
                {{ props.row.concernedTo?.name }}
              </q-chip>
              <span v-else>Inconnu</span>
            </template>
            <template v-else-if="col.name === 'state'">
              <span>{{ col.name === 'state' ? getStatusText(col.value) : col.value }}</span>
            </template>
            <template v-else>
              <span>{{ col.value || col.field(props.row) || '' }}</span>
            </template>
          </q-td>
          <q-td class="text-center" auto-width>
            <q-btn size="sm" :disable="!props.row?.result" :color="getColorState(props.row.state)" round dense @click="expandRow(props)" :icon="getIconState(props.row.state)" />
          </q-td>
        </q-tr>
        <q-tr v-if="props.expand" :props="props">
          <q-td colspan="100%" style="padding: 0">
            <MonacoEditor style="height: 35vh; width: 100%" :model-value="JSON.stringify(props.row?.result, null, 2)" :options="monacoOptions" lang="json" />
            <q-separator class="q-my-none" size="8px" color="primary" />
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </q-page>
</template>
<script lang="ts" setup>
import * as Monaco from 'monaco-editor'

const $dayjs = useDayjs()
const $route = useRoute()
const router = useRouter()

const expanded = ref([])
const foptions = ['En erreur', 'Ok']
const columns = [
  { name: 'state', title: 'Statut', field: 'state', label: 'Statut' },
  { name: 'jobId', title: 'Job Id', field: 'jobId', align: 'right', label: 'N° Job' },
  {
    name: 'identity',
    title: 'Identité',
    field: (row) => row?.concernedTo || {},
    align: 'left',
    label: 'Identité',
  },
  {
    name: 'action',
    title: 'Action',
    field: 'action',
    align: 'left',
    label: 'Action',
  },
  {
    name: 'date',
    title: 'Date',
    field: (row) => $dayjs(row.metadata?.lastUpdatedAt).format('DD/MM/YYYY HH:mm:ss').toString(),
    align: 'left',
    label: 'Date',
  },
]
const query = computed(() => {
  return {
    limit: 2000,
    skip: 0,
    'sort[metadata.lastUpdatedAt]': 'desc',
    ...$route.query,
  }
})
const {
  data: rows,
  pending,
  error,
  refresh,
} = await useHttp('/core/jobs/', {
  method: 'GET',
  transform: (result) => {
    const data = result.data.map((enr) => {
      return enr
    })
    return data
  },
  query,
})

function getColorState(state) {
  switch (state) {
    case -1:
      return 'negative'
    case 9:
      return 'positive'
    case 0:
      return 'warning'
  }
  return 'primary'
}
function getStatusText(state) {
  switch (state) {
    case -1:
      return 'ERR'
    case 9:
      return 'OK'
  }
  return ' '
}
function getIconState(state) {
  switch (state) {
    case -1:
      return 'mdi-account-remove'
    case 9:
      return 'mdi-account-check'
    case 0:
      return 'mdi-account-sync'
  }
}
function push(path) {
  router.push(path)
}

function open(path) {
  window.open(path, '_blank')
}

function expandRow(props) {
  expanded.value = expanded.value.includes(props.row.jobId) ? [] : [props.row.jobId]
  // props.expand = !props.expand
}

const $q = useQuasar()

const isDark = computed(() => {
  return $q.dark.isActive
})

const monacoOptions = computed(() => {
  return <Monaco.editor.IStandaloneEditorConstructionOptions>{
    theme: isDark.value ? 'vs-dark' : 'vs-light',
    readOnly: true,
    minimap: {
      enabled: true,
    },
    scrollBeyondLastColumn: 0,
    scrollBeyondLastLine: false,
  }
})
</script>

<style scoped></style>
