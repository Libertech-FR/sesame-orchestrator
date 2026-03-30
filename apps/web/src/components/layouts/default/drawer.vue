<template lang="pug">
div
  q-drawer.flex(v-model="drawer" side="left" :mini="true" :breakpoint="0" bordered persistent)
    template(#mini)
      q-scroll-area.fit.mini-slot.cursor-pointer
        q-list
          q-item(to="/" clickable v-ripple)
            q-item-section(avatar)
              q-icon(name="mdi-home")
          q-separator
        q-list(v-for="(part, i) in visibleMenuParts" :key="part.label")
          div(v-for="menu in part.menus" :key="menu.path")
            q-item(
              clickable
              v-ripple
              :to="encodePath(menu.path)" :active="encodePath(menu.path) === $route.fullPath"
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
              q-popup-proxy(context-menu :offset="[0, 10]")
                q-list(dense)
                  q-item(clickable v-ripple @click.stop.prevent="openMenu(menu)")
                    q-item-section(avatar)
                      q-icon(name="mdi-open-in-app" color="primary")
                    q-item-section Ouvrir
                  q-item(clickable v-ripple @click.stop.prevent="openMenuNewTab(menu)")
                    q-item-section(avatar)
                      q-icon(name="mdi-open-in-new" color="primary")
                    q-item-section Ouvrir dans un nouvel onglet
                  q-separator(v-if="debug")
                  q-item(
                    clickable
                    v-if="debug"
                    v-ripple
                    @click.stop.prevent="openDebugDialog(menu)"
                  )
                    q-item-section(avatar)
                      q-icon(name="mdi-bug" color="warning")
                    q-item-section
                      q-item-label Debug
          q-separator(v-if="i < visibleMenuParts.length - 1")
  sesame-core-debug-menu-entry-dialog(
    v-model="debugDialogOpen"
    :selected-item="debugSelectedItem"
    :monaco-options="monacoOptions"
  )
</template>

<script lang="ts">
import { useIdentityStateStore } from '~/stores/identityState'
import { useDebug } from '~/composables/useDebug'

export default defineNuxtComponent({
  name: 'LayoutsDefaultDrawer',
  data() {
    return {
      drawer: true,
      menuParts: [],
      debugDialogOpen: false,
      debugSelectedItem: null as any,
    }
  },
  async setup() {
    const identityStateStore = useIdentityStateStore()
    const { menuParts, getMenuByPart, initialize } = useMenu(identityStateStore)
    const { encodePath } = useFiltersQuery(ref([]))
    const { debug, monacoOptions } = useDebug()
    const visibleMenuParts = computed(() => menuParts.value
      .map(part => ({
        ...part,
        menus: getMenuByPart(part.label).filter(menu => menu.hideInMenuBar !== true),
      }))
      .filter(part => part.menus.length > 0))

    await initialize()

    return {
      menuParts,
      visibleMenuParts,
      getMenuByPart,
      encodePath,
      debug,
      monacoOptions,
    }
  },
  methods: {
    openMenu(item: any) {
      this.$router.push(item.path)
    },
    openMenuNewTab(item: any) {
      const encoded = this.encodePath(item.path)
      window.open(encoded, '_blank', 'noopener,noreferrer')
    },
    openDebugDialog(item: any) {
      this.debugSelectedItem = item
      this.debugDialogOpen = true
    },
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
