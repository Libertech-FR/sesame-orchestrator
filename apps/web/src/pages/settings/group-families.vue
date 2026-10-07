<template lang="pug">
.sesame-page
  .sesame-page-content
    sesame-core-twopan.col(
      table-title='Familles de groupes'
      :simple='true'
      :loading='pending'
      :rows='families?.data || []'
      :total='families?.total || 0'
      :columns='columns'
      :visible-columns='visibleColumns'
      :refresh='refresh'
      :targetId='targetId'
      row-key='_id'
      @row-click='(_evt, row) => openGroups(row)'
    )
      template(#before-top-right-before)
        q-btn(
          :disable='!hasPermission("/management/group-families", "create")'
          @click='openDialog()'
          icon='mdi-plus'
          flat
          dense
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/group-families', 'create')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
        q-separator.q-mx-sm(vertical)
      template(#top-table)
        sesame-core-pan-filters(:columns='columns' mode='simple' placeholder='Rechercher par nom, description...')
      template(v-slot:body-cell-name='props')
        q-td(:props='props')
          q-chip(dense size='sm' :color='props.row.color || "grey"' text-color='white' :label='props.row.name')
      template(v-slot:row-actions='{ row }')
        q-btn(
          :disable='!hasPermission("/management/group-families", "update")'
          color='primary'
          icon='mdi-pencil'
          size='sm'
          flat
          round
          dense
          @click.stop='openDialog(row)'
        )
        q-btn(
          :disable='!hasPermission("/management/group-families", "delete")'
          color='negative'
          icon='mdi-delete'
          size='sm'
          flat
          round
          dense
          @click.stop='deleteFamily(row)'
        )
          q-tooltip.text-body2.bg-negative.text-white(
            v-if="!hasPermission('/management/group-families', 'delete')"
            anchor="top middle"
            self="center middle"
          ) Vous n'avez pas les permissions nécessaires pour effectuer cette action
  q-dialog(v-model='groupsDialog')
    q-card(style='min-width: 640px; max-width: 90vw')
      q-toolbar.bg-primary.text-white(flat dense)
        q-toolbar-title Groupes de la famille « {{ groupsFamily?.name }} »
        q-btn(icon='mdi-close' flat round dense v-close-popup)
      q-card-section.q-pa-none
        q-table(
          flat
          dense
          :rows='familyGroups'
          :columns='groupColumns'
          row-key='_id'
          :loading='familyGroupsLoading'
          v-model:pagination='familyGroupsPagination'
          :rows-per-page-options='[10, 20, 50, 100]'
          rows-per-page-label='Lignes par page'
          no-data-label='Aucun groupe dans cette famille'
          @request='onFamilyGroupsRequest'
        )
          template(#body-cell-state='props')
            q-td(:props='props')
              q-chip(
                dense
                size='sm'
                :color='getStateBadge(props.row.state).color'
                :text-color='getStateBadge(props.row.state).textColor || "white"'
                :icon='getStateBadge(props.row.state).icon'
                :label='getStateName(props.row.state)'
              )
          template(#body-cell-actions='props')
            q-td(:props='props')
              q-btn(:to='`/groups/table/${props.row._id}`' color='primary' icon='mdi-eye' size='sm' flat round dense)
                q-tooltip.text-body2 Ouvrir la fiche groupe
  q-dialog(v-model='dialog' persistent)
    q-card(style='min-width: 420px')
      q-toolbar.bg-primary.text-white(flat dense)
        q-toolbar-title {{ form._id ? 'Modifier la famille' : 'Nouvelle famille' }}
        q-btn(icon='mdi-close' flat round dense v-close-popup)
      q-card-section.q-gutter-md
        q-input(
          v-model='form.name'
          label='Nom'
          :rules='[(v) => !!`${v || ""}`.trim() || "Le nom est obligatoire"]'
          autofocus
          outlined
          dense
        )
        q-input(v-model='form.description' label='Description' type='textarea' autogrow outlined dense)
        q-select(
          v-model='form.color'
          :options='colorOptions'
          label='Couleur'
          clearable
          outlined
          dense
        )
          template(#selected)
            q-chip(v-if='form.color' dense size='sm' :color='form.color' text-color='white' :label='form.color')
          template(#option='scope')
            q-item(v-bind='scope.itemProps')
              q-item-section(avatar)
                q-avatar(:color='scope.opt' size='18px')
              q-item-section {{ scope.opt }}
      q-card-actions(align='right')
        q-btn(flat color='grey-8' label='Annuler' v-close-popup)
        q-btn(color='positive' icon='mdi-content-save' label='Enregistrer' @click='save()')
</template>

<script lang="ts">
type FamilyGroup = {
  _id: string
  cn: string
  description?: string | null
  mail?: string | null
  member?: string[]
  state: number
}

type GroupFamily = {
  _id: string
  name: string
  description?: string | null
  color?: string | null
}

export default defineNuxtComponent({
  name: 'SettingsGroupFamiliesPage',
  async setup() {
    const { useHttpPaginationOptions, useHttpPaginationReactive } = usePagination({ name: 'settings-group-families' })
    const { hasPermission } = useAccessControl()
    const { handleErrorReq } = useErrorHandling()
    const { getStateBadge, getStateName } = useIdentityStates()
    const paginationOptions = useHttpPaginationOptions()

    const {
      data: families,
      error,
      pending,
      refresh: refreshFamilies,
      execute,
    } = await useHttp<{ data: GroupFamily[]; total: number }>('/management/group-families', {
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

    const { data: groupsCount, refresh: refreshGroupsCount } = await useHttp<{ data: Record<string, number> }>('/management/group-families/groups-count', {
      method: 'get',
    })

    const refresh = async () => {
      await Promise.all([refreshFamilies(), refreshGroupsCount()])
    }

    return {
      families,
      groupsCount,
      pending,
      refresh,
      hasPermission,
      handleErrorReq,
      getStateBadge,
      getStateName,
    }
  },
  data() {
    return {
      targetId: '',
      dialog: false,
      groupsDialog: false,
      groupsFamily: null as GroupFamily | null,
      familyGroups: [] as FamilyGroup[],
      familyGroupsLoading: false,
      familyGroupsPagination: {
        page: 1,
        rowsPerPage: 20,
        rowsNumber: 0,
        sortBy: 'cn',
        descending: false,
      },
      groupColumns: [
        { name: 'cn', label: 'Nom (cn)', align: 'left', field: (row: FamilyGroup) => row.cn, sortable: true },
        { name: 'description', label: 'Description', align: 'left', field: (row: FamilyGroup) => row.description || '', sortable: true },
        { name: 'mail', label: 'Email', align: 'left', field: (row: FamilyGroup) => row.mail || '', sortable: true },
        { name: 'member', label: 'Membres', align: 'left', field: (row: FamilyGroup) => (Array.isArray(row.member) ? row.member.length : 0) },
        { name: 'state', label: 'État', align: 'left', field: (row: FamilyGroup) => row.state, sortable: true },
        { name: 'actions', label: '', align: 'right', field: () => '' },
      ],
      form: { _id: '', name: '', description: '', color: null as string | null },
      colorOptions: [
        'primary',
        'secondary',
        'accent',
        'red',
        'pink',
        'purple',
        'deep-purple',
        'indigo',
        'blue',
        'light-blue',
        'cyan',
        'teal',
        'green',
        'light-green',
        'lime',
        'amber',
        'orange',
        'deep-orange',
        'brown',
        'grey',
        'blue-grey',
      ],
      visibleColumns: ['name', 'description', 'groups'],
      columns: [
        {
          name: 'name',
          label: 'Nom',
          field: (row: GroupFamily) => row.name,
          align: 'left',
          sortable: true,
        },
        {
          name: 'description',
          label: 'Description',
          field: (row: GroupFamily) => row.description || '',
          align: 'left',
          sortable: true,
        },
        {
          name: 'groups',
          label: 'Groupes',
          field: (row: GroupFamily) => this.groupsCount?.data?.[row._id] || 0,
          align: 'left',
          sortable: false,
        },
      ],
    }
  },
  methods: {
    openGroups(family: GroupFamily) {
      if (!this.hasPermission('/management/groups', 'read')) return
      this.groupsFamily = family
      this.familyGroups = []
      this.familyGroupsPagination.page = 1
      this.familyGroupsPagination.rowsNumber = 0
      this.groupsDialog = true
      this.fetchFamilyGroups()
    },
    async fetchFamilyGroups() {
      if (!this.groupsFamily) return
      this.familyGroupsLoading = true
      try {
        const { page, rowsPerPage, sortBy, descending } = this.familyGroupsPagination
        const res = await this.$http.get('/management/groups', {
          query: {
            'filters[:family]': this.groupsFamily._id,
            limit: rowsPerPage,
            skip: (page - 1) * rowsPerPage,
            ...(sortBy ? { [`sort[${sortBy}]`]: descending ? 'desc' : 'asc' } : {}),
          },
        })
        this.familyGroups = res?._data?.data || []
        this.familyGroupsPagination.rowsNumber = res?._data?.total || 0
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors du chargement des groupes de la famille' })
      } finally {
        this.familyGroupsLoading = false
      }
    },
    onFamilyGroupsRequest(props: { pagination: { page: number; rowsPerPage: number; sortBy: string; descending: boolean } }) {
      Object.assign(this.familyGroupsPagination, props.pagination)
      this.fetchFamilyGroups()
    },
    openDialog(family?: GroupFamily) {
      this.form = {
        _id: family?._id || '',
        name: family?.name || '',
        description: family?.description || '',
        color: family?.color || null,
      }
      this.dialog = true
    },
    async save(): Promise<void> {
      const body = {
        name: `${this.form.name || ''}`.trim(),
        description: `${this.form.description || ''}`.trim() || null,
        color: this.form.color || null,
      }
      if (!body.name) {
        this.$q.notify({ type: 'negative', message: 'Le nom de la famille est obligatoire', position: 'top-right' })
        return
      }

      try {
        if (this.form._id) {
          await this.$http.patch(`/management/group-families/${this.form._id}`, { body })
        } else {
          await this.$http.post('/management/group-families', { body })
        }
        this.dialog = false
        this.$q.notify({
          message: 'Sauvegarde effectuée',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        await this.refresh()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors de la sauvegarde de la famille' })
      }
    },
    deleteFamily(family: GroupFamily): void {
      this.$q
        .dialog({
          title: 'Confirmation',
          message: `Voulez-vous vraiment supprimer la famille « ${family.name} » ?`,
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
        .onOk(async () => {
          try {
            await this.$http.delete(`/management/group-families/${family._id}`)
            this.$q.notify({
              message: 'La famille a été supprimée.',
              color: 'positive',
              position: 'top-right',
              icon: 'mdi-check-circle-outline',
            })
            await this.refresh()
          } catch (error: unknown) {
            this.handleErrorReq({ error, message: 'Impossible de supprimer la famille' })
          }
        })
    },
  },
})
</script>
