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
        v-if='!isNew && !isSuper'
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
        v-if='!isNew && !isChild'
        :disable='!hasPermission("/management/groups", "delete")'
        @click='deleteGroup(data.group)'
        icon='mdi-delete'
        dense
      )
        q-tooltip.text-body2(anchor="top middle" self="center middle") Supprimer le groupe
  .q-pa-md.q-gutter-md
    q-banner.bg-deep-purple-1.text-deep-purple-10(v-if='isChild' dense rounded)
      template(#avatar)
        q-icon(name='mdi-subdirectory-arrow-right' color='deep-purple')
      | Groupe géré par le supergroupe
      |
      a.text-weight-bold.cursor-pointer(@click='navigateToTab(`/groups/table/${data.group.supergroup}`)') {{ parentCn || data.group.supergroup }}
      | &nbsp;: son nom et ses membres sont recalculés automatiquement.
    q-btn-toggle(
      v-model='form.type'
      :options='typeOptions'
      :disable='!canEdit || !isNew'
      toggle-color='primary'
      no-caps
      unelevated
      spread
      dense
    )
    q-input(
      v-model='form.cn'
      label='Nom du groupe (cn)'
      :readonly='!canEdit || isChild'
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
    q-select(
      v-model='form.family'
      :options='familyOptions'
      :label='isChild ? "Famille (héritée du supergroupe)" : "Famille"'
      :readonly='!canEdit || isChild'
      :clearable='!isChild'
      emit-value
      map-options
      outlined
      dense
    )
      template(#selected-item='scope')
        q-chip(dense size='sm' :color='scope.opt.color || "grey"' text-color='white' :label='scope.opt.label')
      template(#option='scope')
        q-item(v-bind='scope.itemProps')
          q-item-section(avatar)
            q-avatar(:color='scope.opt.color || "grey"' size='18px')
          q-item-section
            q-item-label {{ scope.opt.label }}
            q-item-label(v-if='scope.opt.description' caption) {{ scope.opt.description }}
      template(#no-option)
        q-item
          q-item-section.text-grey Aucune famille définie (Paramètres › Familles de groupes)
    q-select(
      v-if='isSuper'
      v-model='form.attribute'
      :options='attributeOptions'
      label='Attribut des identités (un groupe sera créé par valeur)'
      hint='Chemin de l’attribut, ex : inetOrgPerson.departmentNumber'
      :readonly='!canEdit'
      :rules='[(v) => !!`${v || ""}`.trim() || "L’attribut est obligatoire"]'
      use-input
      fill-input
      hide-selected
      new-value-mode='add-unique'
      input-debounce='0'
      outlined
      dense
      @filter='filterAttributes'
      @input-value='(v) => (form.attribute = v)'
    )
    q-input(
      v-if='!isSuper'
      v-model='form.mail'
      label='Adresse email (optionnelle)'
      type='email'
      :readonly='!canEdit'
      :rules='[validateMail]'
      clearable
      outlined
      dense
    )
    sesame-pages-groups-dynamic-filters(
      v-if='isDynamic'
      v-model='form.filters'
      :readonly='!canEdit'
    )
  .q-px-md.q-pb-md(v-if='!isNew && isSuper')
    q-table(
      flat
      bordered
      dense
      title='Groupes rattachés'
      :rows='children'
      :columns='childColumns'
      row-key='_id'
      :loading='childrenLoading'
      v-model:pagination='childrenPagination'
      :rows-per-page-options='[10, 20, 50, 100]'
      rows-per-page-label='Lignes par page'
      no-data-label='Aucun groupe rattaché'
      :grid='childrenView === "grid"'
      card-container-class='q-col-gutter-sm q-pt-sm'
      @request='onChildrenRequest'
      @row-click='(_, row) => openChild(row)'
    )
      template(#top-right)
        q-btn-toggle.q-mr-sm(
          v-model='childrenView'
          :options='childrenViewOptions'
          toggle-color='primary'
          size='sm'
          unelevated
          dense
        )
        q-btn(
          :disable='!canEdit'
          :loading='refreshing'
          color='primary'
          icon='mdi-refresh'
          label='Recalculer'
          no-caps
          flat
          dense
          @click='refreshSupergroup'
        )
      template(#item='props')
        .col-6.col-lg-4
          q-card.cursor-pointer.child-group-tile(flat bordered @click='openChild(props.row)')
            q-card-section.q-pa-sm
              .row.no-wrap.items-center
                q-icon.q-mr-sm(name='mdi-account-group' :color='familyColor(props.row.family)' size='sm')
                .col.ellipsis.text-weight-medium(:title='props.row.cn') {{ props.row.cn }}
              .text-caption.text-grey-7.q-mt-xs
                q-icon.q-mr-xs(name='mdi-account-multiple')
                | {{ props.row.memberCount || 0 }} membre{{ (props.row.memberCount || 0) > 1 ? 's' : '' }}
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
  .q-px-md.q-pb-md(v-if='!isNew && !isSuper')
    q-table(
      flat
      bordered
      dense
      :title='isDynamic ? "Membres calculés par le filtre (member)" : "Membres (member)"'
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
        q-select(
          v-if='canEditMembers'
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
            color='primary'
            icon='mdi-eye'
            size='sm'
            flat
            round
            dense
            @click.stop='openMember(props.row)'
          )
          q-btn(
            v-if='canEditMembers'
            color='negative'
            icon='mdi-account-remove'
            size='sm'
            flat
            round
            dense
            @click.stop='removeMember(props.row)'
          )
  sesame-pages-groups-member-identity-dialog(v-model='memberDialog' :identity-id='memberDialogId')
  sesame-pages-groups-child-group-dialog(v-model='childDialog' :group-id='childDialogId')
</template>

<script lang="ts">
import { NewTargetId } from '~/constants/variables'
import { countFilterConditions, payloadToFilterGroups } from '~/composables/useFiltersQuery'
import type { FilterGroupsPayload } from '~/composables/useFiltersQuery'
import { DEFAULT_IDENTITY_FILTER_FIELD_PATHS } from '~/composables/useFilterFieldOptions'

type GroupType = 'static' | 'dynamic' | 'super'
// format API : { "<signe><champ>": valeur } (ET) ou liste de tels objets (OU)
type DynamicGroupFilters = FilterGroupsPayload

type GroupData = {
  _id: string
  cn: string
  description?: string
  mail?: string | null
  family?: string | null
  type?: GroupType
  filters?: DynamicGroupFilters | null
  attribute?: string | null
  supergroup?: string | null
  member?: string[]
  state?: number
}

// mode d'affichage des groupes rattachés (tuiles ou liste), mémorisé d'une visite à l'autre
const CHILDREN_VIEW_STORAGE_KEY = 'sesame:groups:children-view'

function readChildrenView(): 'grid' | 'list' {
  try {
    return localStorage.getItem(CHILDREN_VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

type ChildGroup = {
  _id: string
  cn: string
  description?: string
  family?: string | null
  state?: number
  memberCount?: number
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
        family: (this.data.group?.family || null) as string | null,
        type: (this.data.group?.type || 'static') as GroupType,
        filters: (this.data.group?.filters || null) as DynamicGroupFilters | null,
        attribute: `${this.data.group?.attribute || ''}`,
      },
      typeOptions: [
        { label: 'Groupe normal', value: 'static', icon: 'mdi-account-group' },
        { label: 'Groupe dynamique', value: 'dynamic', icon: 'mdi-filter-cog' },
        { label: 'Supergroupe', value: 'super', icon: 'mdi-family-tree' },
      ],
      attributeOptions: [...DEFAULT_IDENTITY_FILTER_FIELD_PATHS] as string[],
      parentCn: null as string | null,
      children: [] as ChildGroup[],
      childrenLoading: false,
      refreshing: false,
      childrenView: readChildrenView(),
      childrenViewOptions: [
        { value: 'grid', icon: 'mdi-view-grid', attrs: { 'aria-label': 'Affichage en tuiles' } },
        { value: 'list', icon: 'mdi-view-list', attrs: { 'aria-label': 'Affichage en liste' } },
      ],
      childDialog: false,
      childDialogId: null as string | null,
      childrenPagination: {
        page: 1,
        rowsPerPage: 20,
        rowsNumber: 0,
      },
      childColumns: [
        { name: 'cn', label: 'Nom (valeur)', align: 'left', field: 'cn' },
        { name: 'memberCount', label: 'Membres', align: 'left', field: 'memberCount' },
        { name: 'state', label: 'État', align: 'left', field: 'state' },
      ],
      familyOptions: [] as { label: string; value: string; color?: string | null; description?: string | null }[],
      members: [] as Member[],
      membersLoading: false,
      membersPagination: {
        page: 1,
        rowsPerPage: 20,
        rowsNumber: 0,
      },
      toAdd: [] as string[],
      identityOptions: [] as { label: string; value: string }[],
      memberDialog: false,
      memberDialogId: null as string | null,
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
    isDynamic(): boolean {
      return this.form.type === 'dynamic'
    },
    isSuper(): boolean {
      return this.form.type === 'super'
    },
    // groupe généré par un supergroupe : nom et membres calculés
    isChild(): boolean {
      return !!this.data.group?.supergroup
    },
    // les membres d'un groupe dynamique (enregistré) ou généré par un supergroupe sont calculés par l'API
    canEditMembers(): boolean {
      return this.canEdit && (this.data.group?.type || 'static') === 'static' && !this.isChild
    },
  },
  watch: {
    childrenView(view: string) {
      try {
        localStorage.setItem(CHILDREN_VIEW_STORAGE_KEY, view)
      } catch {
        // stockage indisponible : le choix ne vaut que pour la session
      }
    },
    'data.group': {
      handler(group) {
        this.form.cn = `${group?.cn || ''}`
        this.form.description = `${group?.description || ''}`
        this.form.mail = `${group?.mail || ''}`
        this.form.family = group?.family || null
        this.form.type = group?.type || 'static'
        this.form.filters = group?.filters || null
        this.form.attribute = `${group?.attribute || ''}`
        this.fetchParent()
      },
    },
  },
  mounted() {
    this.fetchFamilies()
    this.fetchParent()
    if (!this.isNew) this.fetchRelated()
  },
  methods: {
    fetchRelated() {
      return this.isSuper ? this.fetchChildren() : this.fetchMembers()
    },
    async fetchParent() {
      const parentId = this.data.group?.supergroup
      if (!parentId) {
        this.parentCn = null
        return
      }
      try {
        const res = await this.$http.get(`/management/groups/${parentId}`)
        this.parentCn = res?._data?.data?.cn || null
      } catch {
        this.parentCn = null
      }
    },
    async fetchChildren() {
      this.childrenLoading = true
      try {
        const { page, rowsPerPage } = this.childrenPagination
        const res = await this.$http.get(`/management/groups/${this.data.group._id}/children`, {
          query: {
            limit: rowsPerPage,
            skip: (page - 1) * rowsPerPage,
            'sort[cn]': 'asc',
          },
        })
        this.children = res?._data?.data || []
        this.childrenPagination.rowsNumber = res?._data?.total || 0
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors du chargement des groupes rattachés' })
      } finally {
        this.childrenLoading = false
      }
    },
    familyColor(familyId?: string | null): string {
      return this.familyOptions.find((family) => family.value === familyId)?.color || 'grey'
    },
    openChild(child: ChildGroup) {
      this.childDialogId = child._id
      this.childDialog = true
    },
    onChildrenRequest(props: { pagination: { page: number; rowsPerPage: number } }) {
      this.childrenPagination.page = props.pagination.page
      this.childrenPagination.rowsPerPage = props.pagination.rowsPerPage
      this.fetchChildren()
    },
    async refreshSupergroup() {
      this.refreshing = true
      try {
        const res = await this.$http.post(`/management/groups/${this.data.group._id}/refresh`)
        const { changed = [], removed = [] } = res?._data?.data || {}
        this.$q.notify({
          message: `${changed.length} groupe(s) créé(s) ou modifié(s), ${removed.length} groupe(s) supprimé(s)`,
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        await this.reloadAll()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors du recalcul du supergroupe' })
      } finally {
        this.refreshing = false
      }
    },
    filterAttributes(val: string, update: (fn: () => void) => void) {
      update(() => {
        const needle = `${val || ''}`.toLowerCase()
        this.attributeOptions = DEFAULT_IDENTITY_FILTER_FIELD_PATHS.filter((path) => path.toLowerCase().includes(needle))
      })
    },
    async fetchFamilies() {
      try {
        const res = await this.$http.get('/management/group-families', {
          query: { limit: 1000, skip: 0, 'sort[name]': 'asc' },
        })
        this.familyOptions = (res?._data?.data || []).map((family: { _id: string; name: string; color?: string | null; description?: string | null }) => ({
          label: family.name,
          value: family._id,
          color: family.color,
          description: family.description,
        }))
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: 'Erreur lors du chargement des familles de groupes' })
      }
    },
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
    openMember(member: Member) {
      this.memberDialogId = member._id
      this.memberDialog = true
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
      const body: Record<string, unknown> = {
        cn: `${this.form.cn || ''}`.trim(),
        description: `${this.form.description || ''}`.trim(),
        // null pour effacer l'adresse : une chaîne vide serait rejetée par la validation email de l'API
        mail: `${this.form.mail || ''}`.trim() || null,
        family: this.form.family || null,
        type: this.form.type,
        // le filtre n'a de sens que pour un groupe dynamique, l'API le retire d'un groupe normal
        filters: this.isDynamic ? this.form.filters : null,
      }
      if (this.isSuper) {
        body.attribute = `${this.form.attribute || ''}`.trim()
        delete body.mail
        delete body.filters
      }
      if (this.isChild) {
        // nom, type, famille et membres sont gérés par le supergroupe
        delete body.cn
        delete body.type
        delete body.family
        delete body.filters
      }
      if (!this.isChild && !body.cn) {
        this.$q.notify({ type: 'negative', message: 'Le nom du groupe est obligatoire', position: 'top-right' })
        return
      }
      if (this.isDynamic && !countFilterConditions(payloadToFilterGroups(this.form.filters))) {
        this.$q.notify({ type: 'negative', message: 'Un groupe dynamique doit avoir au moins un filtre', position: 'top-right' })
        return
      }
      if (this.isSuper && !body.attribute) {
        this.$q.notify({ type: 'negative', message: 'Un supergroupe doit avoir un attribut', position: 'top-right' })
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
      await Promise.all([this.refreshList(), this.fetchRelated()])
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

<style lang="scss" scoped>
.child-group-tile {
  transition: border-color 0.15s;

  &:hover {
    border-color: var(--q-primary);
  }
}
</style>
