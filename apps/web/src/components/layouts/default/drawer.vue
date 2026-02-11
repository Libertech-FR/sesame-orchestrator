<template lang="pug">
q-drawer.flex(v-model="drawer" side="left" :mini="true" :breakpoint="0" bordered persistent)
  template(#mini)
    q-scroll-area.fit.mini-slot.cursor-pointer
      q-list
        q-item(href="/" clickable v-ripple)
          q-item-section(avatar)
            q-icon(name="mdi-home")
        q-separator
      q-list(v-for="part in menuParts" :key="part")
        div(v-for="menu in getMenuByPart(part)")
          q-item(v-if="menu.hideInMenuBar !== true"
            :key="part" clickable v-ripple
            :href="encodePath(menu.path)" :active="encodePath(menu.path) === $route.fullPath" active-class="q-item--active"
          )
            q-separator(v-if='encodePath(menu.path) === $route.fullPath' vertical color='primary' size="5px" style='position: absolute; left: 0; height: 100%; margin-top: -8px;')
            q-item-section(avatar)
              q-icon(:name="menu.icon" :color="menu.color")
            q-badge(
              v-if="menu.badge"
              :color="menu.badge.color"
              :class='["text-" + menu.badge.textColor || "text-white"]'
              v-text='menu.badge.value'
              floating
            )
            q-tooltip.shadow-5.text-uppercase.text-body2(
              v-if="drawer !== false"
              :class='["bg-" + menu.color || "bg-primary", "text-" + menu.textColor || "text-primary"]'
              anchor="center right"
              self="center left"
            ) {{ menu.label }}
        q-separator
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'

export default defineNuxtComponent({
  name: 'LayoutsDefaultDrawer',
  data() {
    return {
      drawer: true,
      menuParts: [],
    }
  },
  async setup() {
    const identityStateStore = useIdentityStateStore()
    const { menuParts, getMenuByPart, initialize } = useMenu(identityStateStore)
    const { encodePath } = useFiltersQuery(ref([]))

    await initialize()

    return {
      menuParts,
      getMenuByPart,
      encodePath,
    }
  },
})
</script>
