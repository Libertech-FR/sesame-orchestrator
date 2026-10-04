<template lang="pug">
.column.no-wrap.full-height.relative(style='padding-top: 38px;')
  q-toolbar.bg-transparent.q-pr-none.sesame-sticky-bar
    q-toolbar-title Fiche groupe
    q-chip(
      v-if='!isNew'
      dense
      size='sm'
      :color='getStateBadge(data.group?.state).color'
      :text-color='getStateBadge(data.group?.state).textColor || "white"'
      :icon='getStateBadge(data.group?.state).icon'
      :label='getStateName(data.group?.state)'
    )
    q-separator(v-for='_ in 2' :key='_' vertical)
    q-btn-group.q-ml-none(flat stretch dense)
      q-btn.q-px-sm.text-orange-8(
        v-if='!isNew'
        :disable='!hasPermission("/management/groups", "update")'
        @click='syncGroup(data.group).then(() => $emit("refresh-group"))'
        icon='mdi-sync'
        dense
      )
        q-tooltip.text-body2(anchor="top middle" self="center middle") Synchroniser le groupe
      q-btn.q-px-sm.text-positive(
        :disable='!hasPermission("/management/groups", isNew ? "create" : "update")'
        @click='save()'
        icon='mdi-content-save'
        dense
      )
        q-tooltip.text-body2(anchor="top middle" self="center middle") Enregistrer
      q-btn.q-px-sm.text-negative(
        v-if='!isNew'
        :disable='!hasPermission("/management/groups", "delete")'
        @click='deleteGroup(data.group)'
        icon='mdi-delete'
        dense
      )
        q-tooltip.text-body2(anchor="top middle" self="center middle") Supprimer le groupe
  .q-pa-md.q-gutter-md
    q-input(
      v-model='form.cn'
      label='Nom du groupe (cn)'
      :readonly='!canEdit'
      :rules='[(v) => !!`${v || ""}`.trim() || "Le nom est obligatoire"]'
      outlined
      dense
    )
    q-input(
      v-model='form.description'
      label='Description'
      :readonly='!canEdit'
      type='textarea'
      autogrow
      outlined
      dense
    )
    q-input(
      v-model='form.mail'
      label='Adresse email (optionnelle)'
      type='email'
      :readonly='!canEdit'
      :rules='[validateMail]'
      clearable
      outlined
      dense
    )
  .q-px-md.q-pb-md(v-if='!isNew')
    q-table(
      flat
      bordered
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
    )
      template(#top-right)
        q-select(
          v-if='canEdit'
          v-model='toAdd'
          :options='identityOptions'
          label='Ajouter des identités'
          style='min-width: 320px'
          use-input
          multiple
          use-chips
          emit-value
          map-options
          input-debounce='300'
          outlined
          dense
          @filter='filterIdentities'
        )
          template(#after)
            q-btn(:disable='!toAdd.length' color='primary' icon='mdi-account-multiple-plus' flat dense @click='addMembers')
      template(#body-cell-actions='props')
        q-td(:props='props')
          q-btn(
            :to='`/identities/table/${props.row._id}`'
            color='primary'
            icon='mdi-eye'
            size='sm'
            flat
            round
            dense
          )
          q-btn(
            :disable='!canEdit'
            color='negative'
            icon='mdi-account-remove'
            size='sm'
            flat
            round
            dense
            @click='removeMember(props.row)'
          )
</template>

<script lang="ts">
import { NewTargetId } from '~/constants/variables'

type GroupData = {
  _id: string
  cn: string
  description?: string
  mail?: string | null
  member?: string[]
  state?: number
}

type Member = {
  _id: string
  deletedFlag?: boolean
  inetOrgPerson?: { cn?: string; uid?: string; mail?: string; employeeNumber?: string[]; employeeType?: string }
}

export default defineNuxtComponent({
  name: 'GroupsTableIdIndexPage',
  inject: ['refresh', 'deleteGroup', 'syncGroup'],
  props: {
    data: {
      type: Object as () => { group: GroupData },
      required: true,
    },
  },
  emits: ['refresh-group'],
  setup() {
    const { hasPermission } = useAccessControl()
    const { navigateToTab } = useRouteQueries()
    const { handleErrorReq } = useErrorHandling()
    const { getStateBadge, getStateName } = useIdentityStates()

    return {
      hasPermission,
      navigateToTab,
      handleErrorReq,
      getStateBadge,
      getStateName,
    }
  },
  data() {
    return {
      form: {
        cn: `${this.data.group?.cn || ''}`,
        description: `${this.data.group?.description || ''}`,
        mail: `${this.data.group?.mail || ''}`,
      },
      members: [] as Member[],
      membersLoading: false,
      membersPagination: {
        page: 1,
        rowsPerPage: 20,
        rowsNumber: 0,
      },
      toAdd: [] as string[],
      identityOptions: [] as { label: string; value: string }[],
      memberColumns: [
        { name: 'cn', label: 'Nom', align: 'left', field: (row: Member) => row.inetOrgPerson?.cn },
        { name: 'uid', label: 'Identifiant (uid)', align: 'left', field: (row: Member) => row.inetOrgPerson?.uid },
        { name: 'mail', label: 'Email', align: 'left', field: (row: Member) => row.inetOrgPerson?.mail },
        { name: 'employeeType', label: 'Type', align: 'left', field: (row: Member) => row.inetOrgPerson?.employeeType },
        { name: 'deletedFlag', label: 'Supprimée', align: 'left', field: (row: Member) => (row.deletedFlag ? 'Oui' : '') },
        { name: 'actions', label: '', align: 'right', field: () => '' },
      ],
    }
  },
  computed: {
    isNew(): boolean {
      return this.$route.params._id === NewTargetId
    },
    canEdit(): boolean {
      return this.hasPermission('/management/groups', this.isNew ? 'create' : 'update')
    },
  },
  watch: {
    'data.group': {
      handler(group) {
        this.form.cn = `${group?.cn || ''}`
        this.form.description = `${group?.description || ''}`
        this.form.mail = `${group?.mail || ''}`
      },
    },
  },
  mounted() {
    if (!this.isNew) this.fetchMembers()
  },
  methods: {
    async fetchMembers() {
      this.membersLoading = true
      try {
        const { page, rowsPerPage } = this.membersPagination
        const res = await this.$http.get(`/management/groups/${this.data.group._id}/members`, {
          query: {
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
    filterIdentities(val: string, update: (fn: () => void) => void) {
      this.$http
        .get('/management/identities', {
          query: { search: val || undefined, limit: 20, skip: 0 },
        })
        .then((res: { _data?: { data?: Member[] } }) => {
          const memberIds = new Set((this.data.group?.member || []).map((id: string) => `${id}`))
          const options = (res?._data?.data || [])
            .filter((identity: Member) => !memberIds.has(`${identity._id}`))
            .map((identity: Member) => ({
              label: [identity.inetOrgPerson?.cn, identity.inetOrgPerson?.uid].filter(Boolean).join(' — '),
              value: identity._id,
            }))
          update(() => {
            this.identityOptions = options
          })
        })
        .catch(() => update(() => (this.identityOptions = [])))
    },
    async addMembers() {
      try {
        await this.$http.post(`/management/groups/${this.data.group._id}/members`, {
          body: { members: this.toAdd },
        })
        this.toAdd = []
        this.notifySaved()
        await this.reloadAll()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: "Impossible d'ajouter les membres" })
      }
    },
    async removeMember(member: Member) {
      try {
        await this.$http.delete(`/management/groups/${this.data.group._id}/members`, {
          body: { members: [member._id] },
        })
        this.notifySaved()
        await this.reloadAll()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Impossible de retirer le membre' })
      }
    },
    async save() {
      const body = {
        cn: `${this.form.cn || ''}`.trim(),
        description: `${this.form.description || ''}`.trim(),
        // null pour effacer l'adresse : une chaîne vide serait rejetée par la validation email de l'API
        mail: `${this.form.mail || ''}`.trim() || null,
      }
      if (!body.cn) {
        this.$q.notify({ type: 'negative', message: 'Le nom du groupe est obligatoire', position: 'top-right' })
        return
      }

      try {
        if (this.isNew) {
          const res = await this.$http.post('/management/groups', { body })
          // la liste doit être rechargée avant de quitter le formulaire, en conservant les filtres/tri de l'URL
          await this.refreshList()
          await this.navigateToTab(`/groups/table/${res?._data?.data?._id}`)
        } else {
          await this.$http.patch(`/management/groups/${this.data.group._id}`, { body })
          await this.reloadAll()
        }
        this.notifySaved()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors de la sauvegarde du groupe' })
      }
    },
    async reloadAll() {
      this.$emit('refresh-group')
      await Promise.all([this.refreshList(), this.fetchMembers()])
    },
    async refreshList() {
      await (this as unknown as { refresh: () => Promise<void> }).refresh()
    },
    validateMail(value?: string | null): true | string {
      const mail = `${value || ''}`.trim()
      return !mail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail) || 'Adresse email invalide'
    },
    notifySaved() {
      this.$q.notify({
        message: 'Sauvegarde effectuée',
        color: 'positive',
        position: 'top-right',
        icon: 'mdi-check-circle-outline',
      })
    },
  },
})
</script>
