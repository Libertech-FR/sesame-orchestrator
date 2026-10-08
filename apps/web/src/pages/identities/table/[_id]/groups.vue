<template lang="pug">
.q-pa-md
  q-card(bordered square flat)
    q-toolbar(bordered dense style="height: 28px; line-height: 28px;")
      q-toolbar-title Groupes (memberOf)
      q-btn(
        icon="mdi-refresh"
        color="primary"
        flat
        round
        dense
        :loading="loading"
        :disable="loading"
        @click="fetchGroups"
      )
    q-separator
    q-card-section
      q-select(
        v-model='selected'
        :options='groupOptions'
        :readonly='!canEdit'
        :loading='loading'
        label="Groupes de l'identité"
        use-input
        multiple
        use-chips
        emit-value
        map-options
        input-debounce='300'
        outlined
        dense
        @filter='filterGroups'
      )
        template(#no-option)
          q-item
            q-item-section.text-grey Aucun groupe trouvé
      .text-caption.text-grey-7.q-mt-sm(v-if='!selected.length') Cette identité n'appartient à aucun groupe.
    q-card-actions(v-if='canEdit' align='right')
      q-btn(
        color='positive'
        icon='mdi-content-save'
        label='Enregistrer'
        :loading='saving'
        :disable='!dirty'
        unelevated
        @click='save'
      )
</template>

<script lang="ts">
type GroupOption = { label: string; value: string; disable?: boolean }
type GroupRow = { _id: string; cn: string; type?: 'static' | 'dynamic' }
type GroupsResponse = { _data?: { data?: GroupRow[] } }

export default defineNuxtComponent({
  name: 'IdentitiesTableIdGroupsPage',
  props: {
    identity: {
      type: Object,
      required: true,
    },
  },
  setup() {
    const { hasPermission } = useAccessControl()
    const { handleErrorReq } = useErrorHandling()

    return { hasPermission, handleErrorReq }
  },
  data() {
    return {
      loading: false,
      saving: false,
      selected: [] as string[],
      initial: [] as string[],
      groupOptions: [] as GroupOption[],
      // libellés des groupes déjà connus, pour garder l'affichage des chips lors d'une recherche
      knownGroups: {} as Record<string, string>,
      // groupes dynamiques : leur appartenance dépend de leur filtre, ils ne sont pas modifiables ici
      dynamicGroups: {} as Record<string, boolean>,
    }
  },
  computed: {
    identityId(): string {
      return (this.identity as { _id?: string })?._id || (this.$route.params._id as string)
    },
    canEdit(): boolean {
      return this.hasPermission('/management/groups', 'update')
    },
    dirty(): boolean {
      return [...this.selected].sort().join(',') !== [...this.initial].sort().join(',')
    },
  },
  mounted() {
    this.fetchGroups()
  },
  methods: {
    async fetchGroups() {
      this.loading = true
      try {
        const res = await this.$http.get(`/management/groups/memberof/${this.identityId}`)
        const groups = (res as GroupsResponse)?._data?.data || []
        this.rememberGroups(groups)
        this.selected = groups.map((group) => `${group._id}`)
        this.initial = [...this.selected]
        this.groupOptions = this.selected.map((id) => this.toOption(id))
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: "Erreur lors du chargement des groupes de l'identité" })
      } finally {
        this.loading = false
      }
    },
    rememberGroups(groups: GroupRow[]) {
      for (const group of groups) {
        this.knownGroups[`${group._id}`] = group.cn
        this.dynamicGroups[`${group._id}`] = group.type === 'dynamic'
      }
    },
    toOption(id: string): GroupOption {
      const label = this.knownGroups[id] || id
      if (!this.dynamicGroups[id]) return { label, value: id }
      return { label: `${label} (dynamique)`, value: id, disable: true }
    },
    filterGroups(val: string, update: (fn: () => void) => void) {
      this.$http
        .get('/management/groups', {
          query: { search: val || undefined, limit: 50, skip: 0, 'sort[cn]': 'asc' },
        })
        .then((res: GroupsResponse) => {
          const groups = res?._data?.data || []
          this.rememberGroups(groups)
          update(() => {
            const ids = new Set([...this.selected, ...groups.map((group) => `${group._id}`)])
            this.groupOptions = [...ids].map((id) => this.toOption(id))
          })
        })
        .catch(() => update(() => {}))
    },
    async save() {
      this.saving = true
      try {
        await this.$http.put(`/management/groups/memberof/${this.identityId}`, {
          body: { groups: this.selected },
        })
        this.$q.notify({
          message: 'Groupes mis à jour',
          color: 'positive',
          position: 'top-right',
          icon: 'mdi-check-circle-outline',
        })
        await this.fetchGroups()
      } catch (error: unknown) {
        this.handleErrorReq({ error, message: "Impossible de mettre à jour les groupes de l'identité" })
      } finally {
        this.saving = false
      }
    },
  },
})
</script>
