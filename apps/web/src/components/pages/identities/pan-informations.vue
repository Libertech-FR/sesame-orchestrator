<template lang="pug">
sesame-core-pan-informations(:data="data")
  template(#actions-right)
    span
      q-tooltip.text-body1.bg-lime-9.text-white(anchor="top middle" self="bottom middle")
        i Dernier import&nbsp;:&nbsp;
        b.font-bold {{ data?.lastSync ? $dayjs(data?.lastSync).format('DD/MM/YYYY HH:mm:ss') : 'N/A' }}
        br
        small Dernier import: Quand l'api à été utilisée pour importer des données d'une identité.
      q-icon(name="mdi-database-import" size="16px" left)
      small {{ data?.lastSync ? $dayjs(data?.lastSync).fromNow() : 'N/A' }}
    q-separator.q-mx-sm(vertical inset)
    span
      q-tooltip.text-body1.bg-purple-8.text-white(anchor="top middle" self="bottom middle")
        i Dernière synchronisation&nbsp;:&nbsp;
        b.font-bold {{ data?.lastBackendSync ? $dayjs(data?.lastBackendSync).format('DD/MM/YYYY HH:mm:ss') : 'N/A' }}
        br
        small Dernière synchronisation: Quand le(s) backend(s) à été utilisé(s) pour synchroniser des données d'une identité.
      q-icon(name="mdi-database-export" size="16px" left)
      small {{ data?.lastBackendSync ? $dayjs(data?.lastBackendSync).fromNow() : 'N/A' }}
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'SesamePagesIdentitiesPanInformationsComponent',
  props: {
    data: {
      type: Object as PropType<Record<string, any>>,
      required: true,
    },
  },
})
</script>
