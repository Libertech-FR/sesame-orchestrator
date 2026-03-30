<template lang="pug">

  q-btn.q-px-sm(@click="toogleDark" flat stretch icon="mdi-theme-light-dark" :size="size")
    q-tooltip.text-body2(anchor="top middle" self="bottom middle") Mode sombre/clair
  q-btn.q-px-sm(flat stretch icon="mdi-frequently-asked-questions" :href="getQAndALink" target="_blank" :size="size")
    q-tooltip.text-body2 Poser&nbsp;une&nbsp;question&nbsp;ou&nbsp;signaler&nbsp;un&nbsp;problème
  q-btn.q-px-sm(flat stretch icon="mdi-help" :href="getDocumentationLink" target="_blank" :size="size")
    q-tooltip.text-body2 Aide&nbsp;et&nbsp;Documentation
</template>

<script lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

export default defineNuxtComponent({
  name: 'HelpButtonsComponent',
  props: {
    size: {
      type: String as PropType<'sm' | 'md' | 'lg'>,
      default: 'sm',
    },
  },
  computed: {
    getQAndALink(): string {
      return (
        'https://github.com/Libertech-FR/sesame-orchestrator/discussions/new?' +
        [
          'category=q-a',
          'title=[QUESTION]%20Votre%20titre%20ici',
          "body=Décrivez%20votre%20question%20ici.%0A%0A---%0A%0A*Merci%20de%20ne%20pas%20oublier%20de%20fournir%20les%20informations%20suivantes%20:%0A%20-%20Version%20de%20l'Orchestrator%20:%20" +
            (this.orchestratorVersion?.currentVersion || 'N/A') +
            '%0A%20-%20Version%20du%20Daemon%20:%20' +
            (this.daemonVersion?.currentVersion || 'N/A') +
            "%0A%20-%20Système%20d'exploitation%20:%20" +
            (navigator.userAgent || 'N/A'),
        ].join('&')
      )
    },
  },
  setup() {
    const orchestratorVersion = inject<{
      currentVersion?: string
      lastVersion?: string
      updateAvailable?: boolean
    }>('orchestratorVersion', {})
    const daemonVersion = inject<{
      currentVersion?: string
      lastVersion?: string
      updateAvailable?: boolean
    }>('daemonVersion', {})

    const route = useRoute()

    const docsBaseUrl = 'https://libertech-fr.github.io/sesame-doc'

    const getRoutePatternPath = () => {
      const matched = route.matched ?? []
      if (matched.length === 0) return route.path

      // Vue Router stocke des segments dynamiques sous la forme `:param`.
      // On reconstruit un chemin complet avec ces placeholders pour pointer vers la doc.
      let pattern = ''
      for (const record of matched) {
        const p = record.path
        if (!p) continue

        if (p === '/') {
          pattern = '/'
          continue
        }

        if (p.startsWith('/')) {
          pattern = p
        } else {
          pattern = `${pattern.endsWith('/') ? pattern.slice(0, -1) : pattern}/${p}`
        }
      }

      pattern = pattern.replace(/\/+/g, '/')
      pattern = pattern.replace(/:([A-Za-z0-9_]+)\([^/]*\)/g, ':$1')
      return pattern === '' ? '/' : pattern.startsWith('/') ? pattern : `/${pattern}`
    }

    const collapseDynamicSegments = (path: string) => {
      if (path === '/') return '/'
      const segments = path.split('/').filter(Boolean)

      const kept: string[] = []
      for (const seg of segments) {
        if (seg.startsWith(':')) break
        kept.push(seg)
      }

      return `/${kept.join('/')}`
    }

    const getDocumentationLink = computed(() => {
      const pattern = getRoutePatternPath()
      const docRoute = collapseDynamicSegments(pattern)
      const docPath = docRoute === '/' ? '/pages/index.html' : `/pages${docRoute}.html`
      return `${docsBaseUrl}${docPath}`
    })

    return {
      orchestratorVersion,
      daemonVersion,
      getDocumentationLink,
    }
  },
  methods: {
    toogleDark() {
      this.$q.dark.toggle()
      window.sessionStorage.setItem('darkMode', this.$q.dark.isActive ? 'true' : 'false')
    },
  },
})
</script>
