<template lang="pug">
  q-dialog(v-model="debugDialog" @show="onDebugDialogShow")
    q-card(style="min-width: 340px; max-width: min(560px, 92vw)")
      q-toolbar.bg-orange-8.text-white(dense)
        q-toolbar-title.text-subtitle2 Debug Application
        q-btn(icon="mdi-close" flat round dense v-close-popup)
      q-separator
      q-card-section.q-pa-md
        q-linear-progress(v-if="debugNetworkLoading" indeterminate color="orange" class="q-mb-md")
        pre.text-body2.q-ma-none(v-else style="white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, monospace;") {{ debugNetworkFormatted }}
  q-dialog(
    v-model="debugSocketDialog"
    seamless
    position="bottom"
    allow-focus-outside
    no-route-dismiss
    no-shake
    no-refocus
    @show="onDebugSocketDialogShow"
  )
    q-card.column.no-wrap.debug-socket-panel(:style="debugSocketPanelStyle")
      .debug-socket-resize-handle(@mousedown.prevent="startSocketDebugResize")
        q-icon(name="mdi-drag-horizontal" size="18px" color="grey-6")
      q-toolbar.bg-orange-8.text-white(dense)
        q-toolbar-title.text-subtitle2 Debug Socket.IO
        q-space
        q-btn(icon="mdi-delete-outline" flat round dense @click="clearSocketDebugEntries")
          q-tooltip Effacer le journal
        q-btn(icon="mdi-close" flat round dense v-close-popup)
          q-tooltip Fermer
      q-separator
      q-card-section.col.q-pa-none(style="overflow: auto; min-height: 0;")
        .text-caption.text-grey-7.q-pa-md(v-if="socketDebugEntries.length === 0") Aucun événement Socket.IO enregistré.
        q-list.q-pa-none(v-else bordered separator)
          q-expansion-item(
            v-for="entry in socketDebugEntries"
            :key="entry.id"
            dense
            expand-separator
            header-class="q-py-sm"
            :model-value="expandedSocketEntryId === entry.id"
            @update:model-value="(expanded) => onSocketEntryExpand(entry.id, expanded)"
          )
            template(#header)
              q-item-section(avatar)
                q-icon(
                  :name="getSocketDebugDirectionMeta(entry.direction).icon"
                  :color="getSocketDebugDirectionMeta(entry.direction).color"
                  size="20px"
                )
              q-item-section
                q-item-label
                  span.text-grey-7 {{ formatSocketDebugTime(entry.at) }}
                  |  {{ entry.namespace }}
                  q-badge.q-ml-xs(color="orange-8" :label="entry.event")
                  q-badge.q-ml-xs(outline color="grey-7" :label="getSocketDebugDirectionMeta(entry.direction).label")
                q-item-label(caption lines="2") {{ formatSocketDebugSummary(entry) }}
            q-card-section.q-pa-sm(:class="$q.dark.isActive ? 'bg-grey-9' : 'bg-grey-1'")
              pre.text-caption.q-ma-none(
                style="white-space: pre-wrap; word-break: break-all; font-family: ui-monospace, monospace;"
              ) {{ formatSocketDebugPayload(entry.payload) }}
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'CoreAppDebugPanelsComponent',
  setup() {
    const panels = useAppDebugPanels()

    onUnmounted(() => {
      panels.stopSocketDebugResize()
    })

    return panels
  },
})
</script>

<style scoped>
.debug-socket-panel {
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.18);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}

.debug-socket-resize-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 12px;
  flex-shrink: 0;
  cursor: ns-resize;
  user-select: none;
  background: rgba(0, 0, 0, 0.04);
}
</style>
