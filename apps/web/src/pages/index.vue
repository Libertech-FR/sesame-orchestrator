<template lang="pug">
q-page.container(padding)
  .column.no-wrap
    div(v-for="(part, i) in menuParts", :key="part")
      q-bar.q-pa-lg.q-mb-sm.transparent(v-show='getMenuByPart(part).length' dense)
        .text-h5 {{ part }}

      .row.q-col-gutter-md
        .col.col-12.col-sm-6.col-md-4.col-lg-3(v-for="item in getMenuByPart(part)" :key="item.label")
          q-btn.q-py-md.fit(
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
              :class='["text-" + item.badge.textColor || "text-white"]'
              :color="item.badge.color"
              v-text="item?.badge?.value"
              floating
            )
      q-separator.q-mt-md.q-mb-sm(v-if="i < menuParts.length - 1" v-show='getMenuByPart(part).length')
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
})
</script>
