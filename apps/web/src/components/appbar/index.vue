<template lang="pug">
q-header
  q-toolbar.bg-primary.text-white(style={ height: '32px' })
    //- div.desktop-hidden
    //-   q-btn(flat @click="closeDrawer()" icon="mdi-menu")
    //-   q-separator(vertical dark inset).q-mx-md
    q-btn.q-pl-none(flat @click="backToIndex()")
      q-avatar(square)
        q-img(src="/config/logo.png" error-src="/default.png" alt="Sesame logo")
      q-toolbar-title SESAME
    //q-separator(vertical dark inset).q-mx-md
    //sesame-AppbarMenu
    q-space
    sesame-AppbarRightButtons(@syncing="emits('syncing', $event)")
</template>

<script lang="ts" setup>
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

defineOptions({
  name: 'Appbar',
})

const $q = useQuasar()
const router = useRouter()

const emits = defineEmits(['closeDrawer', 'syncing'])

function backToIndex() {
  router.push({ name: 'index' })
}

function closeDrawer() {
  emits('closeDrawer')
}
</script>
