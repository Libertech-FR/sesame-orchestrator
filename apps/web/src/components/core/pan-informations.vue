<template lang="pug">
q-bar.row.items-left
  span
    q-tooltip.text-body2.bg-green-8.text-white(anchor="top middle" self="bottom middle")
      span Créé par: {{ data.metadata.createdBy }}
      br
      span Créé le: {{ $dayjs(data.metadata.createdAt).format('DD/MM/YYYY HH:mm:ss') }}
    q-icon(name="mdi-database-plus" size="16px" left)
    small {{ data.metadata.createdBy || 'N/A' }},&nbsp;
    small &nbsp;{{ $dayjs(data.metadata.createdAt || 'N/A').fromNow() }}
  q-separator.q-mx-sm(vertical inset)
  span
    q-tooltip.text-body2.bg-orange-8.text-white(anchor="top middle" self="bottom middle" )
      span Dernière modification par: {{ data.metadata.lastUpdatedBy }}
      br
      span Dernière modification le: {{ $dayjs(data.metadata.lastUpdatedAt).format('DD/MM/YYYY HH:mm:ss') }}
    q-icon(name="mdi-database-clock" size="16px" left)
    small {{ data.metadata.lastUpdatedBy || 'N/A' }},&nbsp;
    small {{ $dayjs(data.metadata.lastUpdatedAt || 'N/A').fromNow() }}
  q-separator.q-mx-sm(vertical inset v-if="$slots.hasOwnProperty('actions-left')")
  slot(name="actions-left")
  q-space
  slot(name="actions-right")
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'SesameCorePanInformationsComponent',
  props: {
    data: {
      type: Object,
      required: true,
    },
  },
})
</script>
