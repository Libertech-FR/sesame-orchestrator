<template lang="pug">
q-dialog(:model-value='modelValue' @update:model-value='$emit("update:modelValue", $event)' @hide='onHide')
  q-card.column.no-wrap(style='width: 900px; max-width: 95vw; height: 85vh')
    q-toolbar.bg-deep-purple.text-white
      q-icon(name='mdi-subdirectory-arrow-right' size='sm')
      q-toolbar-title
        span(v-if='group' v-text='group.cn')
        span(v-else) Groupe rattaché
        q-chip.q-ml-sm(
          v-if='group'
          size='sm'
          :color='getStateBadge(group.state).color'
          :text-color='getStateBadge(group.state).textColor || "white"'
          :icon='getStateBadge(group.state).icon'
          :label='getStateName(group.state)'
        )
      q-btn(v-if='groupId' icon='mdi-open-in-new' flat dense round @click='openFull')
        q-tooltip.text-body2 Ouvrir la fiche complète
      q-btn(icon='mdi-close' flat dense round v-close-popup)
    q-separator
    template(v-if='loading')
      .col.flex.flex-center
        q-spinner(size='3em' color='primary')
    template(v-else-if='group')
      q-list.q-py-sm(dense)
        q-item(v-if='group.description')
          q-item-section
            q-item-label(caption) Description
            q-item-label {{ group.description }}
        q-item(v-if='group.mail')
          q-item-section
            q-item-label(caption) Adresse email
            q-item-label {{ group.mail }}
        q-item
          q-item-section
            q-item-label(caption) Dernière synchronisation
            q-item-label {{ group.lastBackendSync ? $dayjs(group.lastBackendSync).format('DD/MM/YYYY HH:mm:ss') : 'Jamais' }}
      q-separator
      q-table.col(
        flat
        dense
        title='Membres (member)'
        :rows='members'
        :columns='memberColumns'
        row-key='_id'
        :loading='membersLoading'
        v-model:pagination='membersPagination'
        :rows-per-page-options='[10, 20, 50, 100]'
        rows-per-page-label='Lignes par page'
        no-data-label='Aucun membre'
        @request='onMembersRequest'
        @row-click='(_, row) => openMember(row)'
      )
        template(#top-right)
          q-input(
            v-model='search'
            placeholder='Rechercher un membre...'
            :debounce='300'
            clearable
            outlined
            dense
          )
            template(#prepend)
              q-icon(name='mdi-magnify')
    template(v-else)
      .col.flex.flex-center.text-grey Groupe introuvable
  sesame-pages-groups-member-identity-dialog(v-model='memberDialog' :identity-id='memberDialogId')
</template>

<script lang="ts">
type ChildGroup = {
  _id: string
  cn: string
  description?: string
  mail?: string | null
  state?: number
  lastBackendSync?: string | null
}

type Member = {
  _id: string
  deletedFlag?: boolean
  inetOrgPerson?: { cn?: string; uid?: string; mail?: string; employeeType?: string }
}

/**
 * Aperçu en lecture seule d'un groupe généré par un supergroupe et de ses membres
 */
export default defineNuxtComponent({
  name: 'SesamePagesGroupsChildGroupDialogComponent',
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    groupId: {
      type: String as () => string | null,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup() {
    const { navigateToTab } = useRouteQueries()
    const { handleErrorReq } = useErrorHandling()
    const { getStateBadge, getStateName } = useIdentityStates()

    return { navigateToTab, handleErrorReq, getStateBadge, getStateName }
  },
  data() {
    return {
      group: null as ChildGroup | null,
      loading: false,
      search: '' as string | null,
      members: [] as Member[],
      membersLoading: false,
      membersPagination: {
        page: 1,
        rowsPerPage: 20,
        rowsNumber: 0,
      },
      memberDialog: false,
      memberDialogId: null as string | null,
      memberColumns: [
        { name: 'cn', label: 'Nom', align: 'left', field: (row: Member) => row.inetOrgPerson?.cn },
        { name: 'uid', label: 'Identifiant (uid)', align: 'left', field: (row: Member) => row.inetOrgPerson?.uid },
        { name: 'mail', label: 'Email', align: 'left', field: (row: Member) => row.inetOrgPerson?.mail },
        { name: 'employeeType', label: 'Type', align: 'left', field: (row: Member) => row.inetOrgPerson?.employeeType },
        { name: 'deletedFlag', label: 'Supprimée', align: 'left', field: (row: Member) => (row.deletedFlag ? 'Oui' : '') },
      ],
    }
  },
  watch: {
    modelValue(open: boolean) {
      if (open) this.load()
    },
    search() {
      if (!this.modelValue) return
      this.membersPagination.page = 1
      this.fetchMembers()
    },
  },
  methods: {
    async load() {
      if (!this.groupId) return
      this.loading = true
      try {
        const res = await this.$http.get(`/management/groups/${this.groupId}`)
        this.group = res?._data?.data || null
      } catch (error) {
        console.error(error)
        this.group = null
      } finally {
        this.loading = false
      }
      if (this.group) await this.fetchMembers()
    },
    async fetchMembers() {
      if (!this.groupId) return
      this.membersLoading = true
      try {
        const { page, rowsPerPage } = this.membersPagination
        const res = await this.$http.get(`/management/groups/${this.groupId}/members`, {
          query: {
            search: `${this.search || ''}`.trim() || undefined,
            limit: rowsPerPage,
            skip: (page - 1) * rowsPerPage,
            'sort[inetOrgPerson.cn]': 'asc',
          },
        })
        this.members = res?._data?.data || []
        this.membersPagination.rowsNumber = res?._data?.total || 0
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors du chargement des membres' })
      } finally {
        this.membersLoading = false
      }
    },
    onMembersRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
      this.membersPagination.page = props.pagination.page
      this.membersPagination.rowsPerPage = props.pagination.rowsPerPage
      this.fetchMembers()
    },
    openMember(member: Member) {
      this.memberDialogId = member._id
      this.memberDialog = true
    },
    onHide() {
      this.group = null
      this.members = []
      this.search = ''
      this.membersPagination.page = 1
    },
    async openFull() {
      this.$emit('update:modelValue', false)
      await this.navigateToTab(`/groups/table/${this.groupId}`)
    },
  },
})
</script>
