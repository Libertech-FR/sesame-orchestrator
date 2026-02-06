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
  q-timeline.q-px-lg
    q-infinite-scroll.q-px-lg(@load="load" :offset="250")
      template(#loading)
        .row.justify-center.q-my-md
          q-spinner-dots(color="primary" size="40px")

      template(v-for="(day, keyCompute) in computedJobsByDays" :key="keyCompute")
        q-timeline-entry.text-h5
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
          q-card
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
                  coloer="white"
                  icon="mdi-close"
                  flat
                )
            q-separator(v-if="tabs[keyCompute + '_' + key]")
            q-tab-panels.overflow-auto(v-model="tabs[keyCompute + '_' + key]")
              q-tab-panel(name="params")
                MonacoEditor(style="height: 45vh; width: 100%" :model-value="JSON.stringify(job.params, null, 2)" :options="monacoOptions" lang="json")
              q-tab-panel(name="result")
                MonacoEditor(style="height: 45vh; width: 100%;" :model-value="JSON.stringify(job.result, null, 2)" :options="monacoOptions" lang="json")
      q-timeline-entry.text-h5(v-if='empty' icon='mdi-flag-off' title='Fin de la liste...' color="red")
</template>

<script lang="ts">
import * as Monaco from 'monaco-editor'

export default defineComponent({
  name: 'JobsIndexPage',
  data() {
    return {
      tabs: {},
      jobsByOptions: [
        { label: 'Jour', value: 'DD/MM/YYYY' },
        { label: 'Mois', value: 'MM/YYYY' },
        { label: 'Année', value: 'YYYY' },
      ],
    }
  },
  setup() {
    const empty = ref(false)
    const jobs = ref<any>([])
    const $route = useRoute()

    const load = async (index, done) => {
      const offset = (index - 1) * 10
      const { data } = await useHttp<any>(`/core/jobs/`, {
        method: 'GET',
        query: {
          limit: 10,
          skip: offset,
          'sort[metadata.lastUpdatedAt]': 'desc',
          ...$route.query,
        },
      })

      jobs.value.push(...data.value.data)
      done(data.value.data.length === 0)
    }

    return {
      empty,
      jobs,
      load,
    }
  },
  computed: {
    monacoOptions() {
      return <Monaco.editor.IStandaloneEditorConstructionOptions>{
        theme: this.$q.dark.isActive ? 'vs-dark' : 'vs-light',
        readOnly: true,
        minimap: {
          enabled: true,
        },
        scrollBeyondLastColumn: 0,
        scrollBeyondLastLine: false,
      }
    },
    jobsBy: {
      get() {
        return this.$route.query.jobsBy ? `${this.$route.query.jobsBy}` : 'DD/MM/YYYY'
      },
      set(value) {
        this.tabs = [] // Reset tabs when changing jobsBy
        this.$router.replace({
          query: {
            ...this.$route.query,
            jobsBy: value,
          },
        })
      },
    },
    computedJobsByDays() {
      const jobsByDays = {}

      this.jobs?.forEach((job) => {
        const day = this.$dayjs(job.metadata?.createdAt).format(this.jobsBy)
        if (!jobsByDays[day]) {
          jobsByDays[day] = []
        }
        jobsByDays[day].push(job)
      })

      return jobsByDays
    },
  },
  methods: {
    getColorState(state) {
      switch (state) {
        case -1:
          return 'negative'

        case 9:
          return 'positive'

        default:
          return 'primary'
      }
    },
    getIconState(state) {
      switch (state) {
        case -1:
          return 'mdi-account-remove'
        case 9:
          return 'mdi-account-check'
        default:
          return 'mdi-help'
      }
    },
  },
})
</script>
