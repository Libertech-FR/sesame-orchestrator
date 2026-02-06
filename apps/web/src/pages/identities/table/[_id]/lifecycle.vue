<template lang="pug">
div
  div(style='position: sticky; top: 0; z-index: 1;')
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
  q-timeline.q-px-lg
    q-infinite-scroll.q-px-lg(@load="load" :offset="250")
      template(#loading)
        .row.justify-center.q-my-md
          q-spinner-dots(color="primary" size="40px")
      template(v-for="(day, keyCompute) in computedLifecyclesByDays" :key="keyCompute")
        q-timeline-entry.text-h5
          time(v-text="keyCompute")
        q-timeline-entry.q-timeline-custom(
          v-for="(lifecycle, key) in day" :key="key" :id="`lifecycle-el-${key}`"
          :icon="getLifecycleIcon(lifecycle.lifecycle)" :color="getTimelineColor(key, lifecycle.lifecycle)"
        )
          template(#title)
            span(v-text="'[' + lifecycle._id + ']'")
            | &nbsp; - &nbsp;
            span(v-text="lifecycle.refId?.inetOrgPerson?.cn")
            | &nbsp; (
            small(v-text="lifecycle.refId?.inetOrgPerson?.uid")
            | )
          template(#subtitle)
            q-bar(style='background-color: transparent' dense)
              q-space
              q-icon(name="mdi-clock" size="20px" left)
              time(v-text="$dayjs(lifecycle.metadata?.createdAt).format('DD/MM/YYYY HH:mm:ss').toString()")
          q-card.q-pa-md.text-center(flat)
            p.q-mb-none.text-body1 Passage à l'état : {{ getLifecycleName(lifecycle.lifecycle) }}
      q-timeline-entry.text-h5(v-if='empty' icon='mdi-flag-off' title='Fin de la liste...' color="red")
</template>

<script lang="ts">
import { ref, computed, nextTick } from 'vue'

export default defineNuxtComponent({
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
    const { getLifecycleColor, getLifecycleName, getLifecycleIcon } = await useIdentityLifecycles()

    const scrollTargetRef = ref(null)
    const tabs = ref([])

    const $route = useRoute()
    const $router = useRouter()
    const $dayjs = useDayjs()

    const offset = ref(0)

    // const query = computed(() => {
    //   return {
    //     limit: 10,
    //     skip: offset.value * 10,
    //     'sort[metadata.lastUpdatedAt]': 'desc',
    //     ...$route.query,
    //   }
    // })

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

    const computedLifecyclesByDays = computed(() => {
      const lifecyclesByDays = {}
      lifecycles.value.forEach((job) => {
        const day = $dayjs(job.metadata?.createdAt).format(lifecyclesBy.value)
        if (!lifecyclesByDays[day]) {
          lifecyclesByDays[day] = []
        }
        lifecyclesByDays[day].push(job)
      })
      return lifecyclesByDays
    })

    return {
      scrollTargetRef,
      tabs,
      offset,
      // query,
      lifecyclesBy,
      empty,
      lifecycles,
      computedLifecyclesByDays,
      getLifecycleColor,
      getLifecycleName,
      getLifecycleIcon,
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

        console.log(res)

        this.lifecycles.push(...res._data.data)
        this.empty = res._data.data.length === 0
        done(res._data.data.length === 0)
      } catch (e) {
        done(true)
      }
    },
    getTimelineColor(key: string, lifecycle: string): string {
      const color = this.getLifecycleColor(lifecycle)

      if (color.startsWith('#')) {
        nextTick(() => {
          const container = document.getElementById(`lifecycle-el-${key}`)
          const timelineElement = container?.querySelector('.q-timeline__dot') as HTMLElement | null

          if (timelineElement) {
            timelineElement.style.setProperty('--timeline-color', color)
          }
        })
      }

      return color
    },
  },
})
</script>

<style>
.q-timeline-custom .q-timeline__dot {
  color: var(--timeline-color) !important;
}
</style>
