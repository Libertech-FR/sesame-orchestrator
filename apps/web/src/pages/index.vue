<template lang="pug">
q-page.container(padding)
  .column.no-wrap
    div(v-for="(part, i) in menuParts", :key="i")
      q-bar.q-pa-lg.q-mb-sm.transparent(v-show='getMenuByPart(part.label).length' dense)
        .text-h5 {{ part.label }}

      .row.q-col-gutter-md
        .col.col-12.col-sm-6.col-md-4.col-lg-3(v-for="item in getMenuByPart(part.label)" :key="item.label")
          q-btn.q-py-md.fit(
            :style='getButtonStyle(item)'
            :class='["text-" + item.textColor || "text-white"]'
            :color="item.color"
            :label="item.label"
            @click="$router.push(item.path)"
            :icon="item.icon"
            size="lg"
            stretch
          )
            q-badge.text-bold(
              v-if="item.badge"
              :style='getBadgeStyle(item)'
              :class='["text-" + item.badge.textColor || "text-white"]'
              :color="item.badge.color"
              v-text="item?.badge?.value"
              floating
            )
      q-separator.q-mt-md.q-mb-sm(v-if="i < menuParts.length - 1" v-show='getMenuByPart(part.label).length')
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'

export default defineNuxtComponent({
  name: 'IndexPage',
  data() {
    return {
      menuParts: [],
    }
  },
  setup() {
    const identityStateStore = useIdentityStateStore()
    const { menuParts, getMenuByPart } = useMenu(identityStateStore)

    return {
      menuParts,
      getMenuByPart,
    }
  },
  methods: {
    getBadgeStyle(item) {
      const badgeColor = item.badge?.color?.startsWith('linear-gradient') || item.badge?.color?.startsWith('#') ? item.badge.color : ''
      const badgeTextColor = item.badge?.textColor?.startsWith('linear-gradient') || item.badge?.textColor?.startsWith('#') ? item.badge.textColor : ''

      return {
        background: badgeColor,
        color: badgeTextColor,
      }
    },
    getButtonStyle(item) {
      return {
        background: item.color?.startsWith('linear-gradient') || item.color?.startsWith('#') ? item.color : '',
        color: item.textColor?.startsWith('linear-gradient') || item.textColor?.startsWith('#') ? item.textColor : '',
      }
    },
  },
})
</script>
