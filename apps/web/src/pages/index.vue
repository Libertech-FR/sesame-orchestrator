<template lang="pug">
q-page.q-px-md(style="margin: auto; max-width: 1366px;")
  .column.no-wrap
    div(v-for="(part, i) in menuParts", :key="part")
      q-bar.q-pa-lg.q-mb-sm.transparent(dense)
        .text-h5 {{ part }}

      .row.q-col-gutter-md
        div.col(
          v-for="item in getMenuByPart(part)" :key="item.label"
          class="col-12 col-sm-6 col-md-6 col-lg-4"
        )
          q-btn.q-py-md.fit(
            :color="item.color"
            :label="item.label"
            @click="push(item.path)"
            :icon="item.icon"
            style="font-size: 18px;"
            tile
          )
            q-badge(v-if="item.badge" :color="item.badge.color" floating v-text="item?.badge?.value")
      q-separator.q-mt-md.q-mb-sm(v-if="i < menuParts.length - 1")
</template>

<script lang="ts" setup>
import { useIdentityStateStore } from '~/stores/identityState'
import { useMenu } from '~/composables'

const router = useRouter()
const identityStateStore = useIdentityStateStore()

const { getMenu, menuParts, getMenuByPart } = useMenu(identityStateStore)

function push(path: string) {
  router.push(path)
}
</script>
