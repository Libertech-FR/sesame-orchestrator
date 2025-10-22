<template lang="pug">
div
  .q-px-md.row
    q-space
    q-select.col-4(
      v-model="jobsBy"
      :options="jobsByOptions"
      label="Regrouper par"
      emit-value
      map-options
    )
  //-   sesame-searchfilters(:fields="fieldsList")
  q-timeline.q-px-lg
    q-infinite-scroll.q-px-lg(@load="load" :offset="250")
      template(#loading)
        .row.justify-center.q-my-md
          q-spinner-dots(color="primary" size="40px")
      //- q-timeline-entry.text-h5(icon='mdi-flag' title='Début de la liste des journaux' color="green")

      template(v-for="(day, keyCompute) in computedJobsByDays" :key="keyCompute")
        q-timeline-entry.text-h5(

        )
          time(v-text="keyCompute")
        q-timeline-entry(
          v-for="(job, key) in day" :key="key"
          :icon="getIconState(job.state)" :color="getColorState(job.state)"
        )
          template(#title)
            span(v-text="'[' + job.jobId + ']'")
            | &nbsp; - &nbsp;
            span(v-text="job.params?.identity?.identity?.inetOrgPerson?.cn")
            | &nbsp;
            span(v-text="job.params?.identity?.identity?.inetOrgPerson?.givenName")
          template(#subtitle)
            q-card.bg-transparent(flat)
              q-card-actions
                div(v-text="job.action")
                q-space
                div
                  q-icon(name="mdi-clock" size="20px" left)
                  time(v-text="$dayjs(job.metadata?.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()")
          q-card(flat)
            q-tabs(
              v-model="tabs[keyCompute + '_' + key]"
              align="justify"
              dense
            )
              q-tab(name="params") Paramètres d'appel
              q-separator(vertical)
              q-tab(name="result") Résultat
              template(v-if="tabs[keyCompute + '_' + key]")
                q-separator(vertical)
                q-btn(
                  @click="delete tabs[keyCompute + '_' + key]"
                  slot="right"
                  color="white"
                  icon="mdi-close"
                  flat
                )
            q-tab-panels.overflow-auto(v-model="tabs[keyCompute + '_' + key]" style="max-height: 300px")
              q-tab-panel(name="params")
                pre(v-html="JSON.stringify(job.params, null, 2)")
              q-tab-panel(name="result")
                pre(v-html="JSON.stringify(job.result, null, 2)")
      q-timeline-entry.text-h5(v-if='empty' icon='mdi-flag-off' title='Fin de la liste...' color="red")
</template>

<script lang="ts" setup>
// const fieldsList = computed(() => {
//   return columns.value!.reduce((acc: { name: string; label: string; type?: string }[], column) => {
//     if (visibleColumns.value!.includes(column.name) && column.name !== 'actions' && column.name !== 'states') {
//       const type = columnsType.value.find((type) => type.name === column.name)?.type
//       acc.push({
//         name: column.name,
//         label: column.label,
//         type,
//       })
//     }
//     return acc
//   }, [])
// })

const scrollTargetRef = ref(null)
const tabs = ref([])

const $route = useRoute()
const $router = useRouter()
const $dayjs = useDayjs()

const offset = ref(0)
const query = computed(() => {
  return {
    limit: 10,
    skip: offset.value * 10,
    'sort[metadata.lastUpdatedAt]': 'desc',
    ...$route.query,
  }
})

const jobsBy = computed({
  get: () => ($route.query.jobsBy ? `${$route.query.jobsBy}` : undefined),
  set: (value) => {
    tabs.value = [] // Reset tabs when changing jobsBy
    $router.replace({
      query: {
        ...$route.query,
        jobsBy: value,
      },
    })
  },
})
if (!jobsBy.value) {
  console.log('jobsBy.value', jobsBy.value)
  jobsBy.value = 'DD/MM/YYYY'
}

const jobsByOptions = [
  { label: 'Jour', value: 'DD/MM/YYYY' },
  { label: 'Mois', value: 'MM/YYYY' },
  { label: 'Année', value: 'YYYY' },
]

const empty = ref(false)
const jobs = ref<any>([])

const computedJobsByDays = computed(() => {
  const jobsByDays = {}
  jobs.value.forEach((job) => {
    const day = $dayjs(job.metadata?.createdAt).format(jobsBy.value)
    if (!jobsByDays[day]) {
      jobsByDays[day] = []
    }
    jobsByDays[day].push(job)
  })
  return jobsByDays
})

const load = async (index, done) => {
  offset.value = index - 1
  const { data, pending, error, refresh } = await useHttp<any>(`/core/jobs/`, {
    method: 'GET',
    query,
  })

  jobs.value.push(...data.value.data)
  empty.value = data.value.data.length === 0
  done(data.value.data.length === 0)
}

function getColorState(state) {
  switch (state) {
    case -1:
      return 'negative'
    case 9:
      return 'positive'
    default:
      return 'primary'
  }
}

function getIconState(state) {
  switch (state) {
    case -1:
      return 'mdi-account-remove'
    case 9:
      return 'mdi-account-check'
    default:
      return 'mdi-help'
  }
}
</script>
