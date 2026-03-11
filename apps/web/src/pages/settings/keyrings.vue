<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Trousseau de clés API'
      :simple='true'
      :loading='pending'
      :rows='keyrings?.data || []'
      :total='keyrings?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      row-key='_id'
    )
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par nom, rôle, réseau autorisé...')
      template(v-slot:row-actions='{ row }')
        q-btn(
          :disable='!hasPermission("/core/keyrings", "delete")'
          color='negative'
          icon='mdi-delete'
          size='sm'
          flat
          round
          dense
          @click='deleteKeyring(row)'
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/core/keyrings', 'delete')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'SettingsKeyringsPage',
  data() {
    return {
      visibleColumns: ['name', 'allowedNetworks', 'roles', 'suspendedAt'],
      columns: [
        {
          name: 'name',
          label: 'Nom',
          field: (row) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'allowedNetworks',
          label: 'Réseaux autorisés',
          field: (row) => (Array.isArray(row.allowedNetworks) ? row.allowedNetworks.join(', ') : ''),
          align: 'left',
          sortable: false,
        },
        {
          name: 'roles',
          label: 'Rôles',
          field: (row) => (Array.isArray(row.roles) ? row.roles.join(', ') : ''),
          align: 'left',
          sortable: false,
        },
        {
          name: 'suspendedAt',
          label: 'Expire',
          field: (row) => (row.suspendedAt ? this.$dayjs(row.suspendedAt).format('DD/MM/YYYY HH:mm:ss') : 'Jamais'),
          align: 'left',
          sortable: true,
        },
      ],
    }
  },
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination()
    const { hasPermission } = useAccessControl()
    const paginationOptions = useHttpPaginationOptions()

    const {
      data: keyrings,
      error,
      pending,
      refresh,
      execute,
    } = await useHttp<any>('/core/keyrings', {
      method: 'get',
      ...paginationOptions,
    })
    if (error.value) {
      console.error(error.value)
      throw showError({
        statusCode: 500,
        statusMessage: 'Internal Server Error',
      })
    }

    useHttpPaginationReactive(paginationOptions, execute)

    return {
      keyrings,
      pending,
      refresh,
      hasPermission,
    }
  },
  methods: {
    async deleteKeyring(keyring: Record<string, any>): Promise<void> {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: 'Voulez-vous vraiment supprimer cette clé API ?',
          persistent: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Supprimer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(() => {
          this.$http
            .delete(`/core/keyrings/${keyring._id}`)
            .then(() => {
              this.$q.notify({
                message: 'La clé API a été supprimée.',
                color: 'positive',
                position: 'top-right',
                icon: 'mdi-check-circle-outline',
              })
              this.refresh()
            })
            .catch((error: any) => {
              this.$q.notify({
                message: `Impossible de supprimer la clé API : ${error?.response?._data?.message || 'erreur inconnue'}`,
                color: 'negative',
                position: 'top-right',
                icon: 'mdi-alert-circle-outline',
              })
            })
        })
    },
  },
})
</script>
