<template lang="pug">
q-bar.row.items-left
  span
    q-tooltip.text-body1.bg-green-8.text-white(anchor="top middle" self="bottom middle")
      i Créé par&nbsp;:&nbsp;
      b.font-bold {{ data?.metadata?.createdBy || 'N/A' }}
      br
      i Date de création&nbsp;:&nbsp;
      b.font-bold {{ $dayjs(data?.metadata?.createdAt).format('DD/MM/YYYY HH:mm:ss') }}
      br
      small Créé par: Date de création initiale de l'identité.
    q-icon(name="mdi-database-plus" size="16px" left)
    small {{ data?.metadata?.createdBy || 'N/A' }},&nbsp;
    small &nbsp;{{ $dayjs(data?.metadata?.createdAt || 'N/A').fromNow() }}
  q-separator.q-mx-sm(vertical inset)
  span
    q-tooltip.text-body1.bg-orange-8.text-white(anchor="top middle" self="bottom middle" )
      i Dernière modification effectuée par&nbsp;:&nbsp;
      b.font-bold {{ data?.metadata?.lastUpdatedBy || 'N/A' }}
      br
      i Dernière modification le&nbsp;:&nbsp;
      b.font-bold {{ $dayjs(data?.metadata?.lastUpdatedAt).format('DD/MM/YYYY HH:mm:ss') }}
      br
      small Dernière modification: Quand l'identité à été modifiée pour la dernière fois.
    q-icon(name="mdi-database-clock" size="16px" left)
    small {{ data?.metadata?.lastUpdatedBy || 'N/A' }},&nbsp;
    small {{ $dayjs(data?.metadata?.lastUpdatedAt || 'N/A').fromNow() }}
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
