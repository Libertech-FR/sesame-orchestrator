<template lang="pug">
q-dialog(v-model="dialogOpen" persistent position="top")
  q-card(style="min-width: 35vw;")
    q-toolbar.bg-orange-8.text-light
      q-icon(name="mdi-bug" size="sm" color="light")
      q-toolbar-title Debug entrée de menu
      q-btn(flat round dense icon="mdi-close" v-close-popup)
    q-card-section
      q-list(separator)
        q-item
          q-item-section
            q-item-label Label (nom)
            .text-weight-medium {{ selectedItem?.label || 'N/A' }} ({{ selectedItem?.name || 'N/A' }})
        q-item
          q-item-section
            q-item-label Part
            .text-body2 {{ selectedItem?.part || '-' }}
        q-item
          q-item-section
            q-item-label ACL requis
            .text-body2 {{ selectedItem?.acl?.length ? selectedItem?.acl.join(', ') : 'N/A' }}
        q-item
          q-item-section
            q-item-label Rôles requis
            .text-body2 {{ selectedItem?.roles?.length ? selectedItem?.roles.join(', ') : 'N/A' }}

    q-card-section.q-pa-none
      q-bar.bg-orange-8.text-white
        q-toolbar-title Détails de l'entrée

      client-only
        q-separator.q-my-md
        div(style="min-height: 320px;")
          LazyMonacoEditor.fit(
            style="min-height: 320px;"
            :model-value='JSON.stringify(selectedItem || {}, null, 2)'
            :options='monacoOptions'
            lang='json'
          )
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'DebugMenuEntryDialog',
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
    selectedItem: {
      type: Object as () => Record<string, any> | null,
      required: false,
      default: null,
    },
    monacoOptions: {
      type: Object as () => Record<string, any>,
      required: false,
      default: () => ({}),
    },
  },
  emits: ['update:modelValue'],
  computed: {
    dialogOpen: {
      get() {
        return this.modelValue
      },
      set(value: boolean) {
        this.$emit('update:modelValue', value)
      },
    },
  },
})
</script>

