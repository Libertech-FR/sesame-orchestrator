<template lang="pug">
q-drawer.flex(v-model="drawer" side="left" :mini="true" :breakpoint="0" bordered persistent)
  template(#mini)
    q-scroll-area.fit.mini-slot.cursor-pointer
      q-list
        q-item(href="/" clickable v-ripple)
          q-item-section(avatar)
            q-icon(name="mdi-home")
        q-separator
      q-list(v-for="(part, i) in menuParts" :key="i")
        div(v-for="menu in getMenuByPart(part.label)")
          q-item(v-if="menu.hideInMenuBar !== true"
            :key="i" clickable v-ripple
            :href="encodePath(menu.path)" :active="encodePath(menu.path) === $route.fullPath"
            active-class="q-item--active"
          )
            q-separator(v-if='encodePath(menu.path) === $route.fullPath' vertical color='primary' size="5px" style='position: absolute; left: 0; height: 100%; margin-top: -8px;')
            q-item-section(avatar)
              q-icon(
                :style='getButtonStyle(menu)'
                :name="menu.icon"
                :color="menu.color"
                :class="{ 'gradient-icon': isGradient(menu) }"
              )
            q-badge(
              v-if="menu.badge"
              :style='getBadgeStyle(menu)'
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
  methods: {
    isGradient(item) {
      const c = item.drawerColor || item.color || ''
      return typeof c === 'string' && c.startsWith('linear-gradient')
    },
    getBadgeStyle(item) {
      const badgeColor = item.badge?.color?.startsWith('linear-gradient') || item.badge?.color?.startsWith('#') ? item.badge.color : ''
      const badgeTextColor = item.badge?.textColor?.startsWith('linear-gradient') || item.badge?.textColor?.startsWith('#') ? item.badge.textColor : ''

      return {
        background: badgeColor || '',
        color: badgeTextColor || '',
      }
    },
    getButtonStyle(item) {
      const drawerColor = item.drawerColor?.startsWith('linear-gradient') || item.drawerColor?.startsWith('#') ? item.drawerColor : ''
      const color = item.color?.startsWith('linear-gradient') || item.color?.startsWith('#') ? item.color : ''

      const finalColor = drawerColor || color || ''

      if (finalColor && finalColor.startsWith('linear-gradient')) {
        return {
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          background: finalColor,
          color: 'transparent',
        }
      }

      return {
        color: finalColor,
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.gradient-icon {
  background-clip: text !important;
  -webkit-background-clip: text !important;
  color: transparent !important;
}
</style>
