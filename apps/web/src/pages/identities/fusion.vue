<template lang="pug">
q-page.container
  q-table(
    flat bordered
    title="Détection des identités en double"
    dense
    :rows="fusionnables || []"
    :columns="fieldsName"
    row-key="k"
    :rows-per-page-options="[20, 50, 100]"
    rows-per-page-label="Lignes par page"
    no-data-label="Aucune donnée"
    loading-label="Chargement..."
    no-results-label="Aucun résultat"
  )
    template(v-slot:top-right)
      q-select(
        v-model="includeIgnoredFilter"
        :options="foptions"
        dense
        outlined
        hide-dropdown-icon
        label="Filtrer les fusions ignorées"
        @update:model-value="updateIncludeIgnoredFilter"
        style="width: 150px"
        map-options
      )
    template(v-slot:body="props")
      q-tr(:props="props")
        q-td(
          v-for="col in props.cols"
          :key="col.name"
          :props="props"
        )
          q-btn-group(v-if="col.name === 'id1'" flat)
            q-btn(color="green" flat size="md" icon="mdi-account-edit" @click="edit(col.value,'positive')" dense)
              q-tooltip.text-body2 Editer l'identité
            q-btn(color="green" flat size="md" icon="mdi-account-multiple" @click="fusion(props.cols[0].value,props.cols[6].value)" dense)
              q-tooltip.text-body2 fusionner les deux identités
            q-btn(color="green" flat size="md" icon="mdi-account-remove" @click="deleteDialog(props.cols[0].value,props.cols[6].value)" dense)
              q-tooltip.text-body2 supprimer l'identité

          q-btn-group(v-else-if="col.name === 'sep'" flat)
            q-btn(
              v-if="!isIgnored(props.row)"
              :color="$q.dark.isActive ? 'grey' : 'black'"
              flat size="md"
              icon="mdi-account-switch"
              @click="ignoreFusion([props.cols[0].value, props.cols[6].value])"
              dense
            )
              q-tooltip.text-body2 Ignorer la fusion pour ces identités
            q-btn(
              v-else
              :color="$q.dark.isActive ? 'orange-8' : 'orange-8'"
              flat size="md"
              icon="mdi-account-switch-outline"
              @click="unignoreFusion([props.cols[0].value, props.cols[6].value])"
              dense
            )
              q-tooltip.text-body2 Fusion ignorée pour ces identités, cliquer pour réactiver la fusion

          q-btn-group(v-else-if="col.name === 'id2'" flat)
            q-btn(color="red" flat size="md" icon="mdi-account-edit" @click="edit(col.value,'negative')" dense)
              q-tooltip.text-body2 Editer l'identité
            q-btn(color="red" flat size="md" icon="mdi-account-multiple" @click="fusion(props.cols[6].value,props.cols[0].value)" dense)
              q-tooltip.text-body2 fusionner les deux identités
            q-btn(color="red" flat size="md" icon="mdi-account-remove" @click="deleteDialog(props.cols[6].value,props.cols[0].value)" dense)
              q-tooltip.text-body2 supprimer l'identité

          span(v-else) {{ col.value }}
  q-dialog(v-model="editForm" transition-show='none' transition-hide='none' full-width full-height persistent)
    q-card.sesame-sticky-dialog
      q-toolbar.bg-primary.text-white(:class="'bg-' + cnColor")
        q-toolbar-title Édition de l'identité ({{ cn }})
        q-btn(class="q-mx-xs" icon="mdi-close" @click="closeModal" flat round dense)
          q-tooltip Fermer
      .flex.fit
        .sesame-page.fit
          .sesame-page-content
            q-card-section.fit.q-pa-none
              sesame-pages-identities-schemas-bar(:identity='identity')
                template(#items="{ tabs }")
                  q-tab-panel.q-pa-none(name="inetOrgPerson")
                    sesame-core-jsonforms-renderer(
                      schemaName="inetOrgPerson"
                      v-model="identity.inetOrgPerson"
                      v-model:validations="validations"
                    )
                  q-tab-panel.q-pa-none(v-for="t in tabs" :key="t" :name="t")
                    sesame-core-jsonforms-renderer(
                      :schema-name="t"
                      v-model="identity.additionalFields.attributes[t]"
                      v-model:validations="validations"
                    )
          q-card-actions.sticky-footer.border-top.full-width
            q-space
            q-btn(class="q-mx-xs" icon="mdi-check" color="positive" label='Enregistrer' @click="submit")
              q-tooltip Enregistrer
</template>

<script lang="ts">
export default defineNuxtComponent({
  name: 'IdentitiesFusionPage',
  data() {
    return {
      cn: '',
      cnColor: 'text-positive',
      editForm: false,
      identity: {} as any,
      validations: {} as any,
      foptions: [
        { label: 'À fusionner', value: '0' },
        { label: 'Tous', value: '1' },
      ],
      fieldsName: [
        { name: 'id1', label: 'Action', field: 'id1', align: 'center', classes: 'leftidlight' },
        { name: 'uid1', label: 'Identité 1', field: 'uid1', align: 'left', classes: 'leftid' },
        { name: 'cn1', label: 'Nom Prenom 1', field: 'cn1', align: 'left', classes: 'leftidlight' },
        { name: 'employeeNumber1', label: 'Numéro', field: 'employeeNumber1', align: 'left', classes: 'leftidlight' },
        { name: 'departmentNumber1', label: 'Département', field: 'departmentNumber1', align: 'left', classes: 'leftidlight' },
        { name: 'sep', label: '', field: 'sep', align: 'left', classes: 'seplight' },
        { name: 'id2', label: 'Action', field: 'id2', align: 'center', classes: 'rightidlight' },
        { name: 'uid2', label: 'Identité 2', field: 'uid2', align: 'left', classes: 'rightid' },
        { name: 'cn2', label: 'Nom Prenom 2', field: 'cn2', align: 'left', classes: 'rightidlight' },
        { name: 'employeeNumber2', label: 'Numéro', field: 'employeeNumber2', align: 'left', classes: 'rightidlight' },
        { name: 'departmentNumber2', label: 'Département', field: 'departmentNumber2', align: 'left', classes: 'rightidlight' },
      ],
    }
  },
  async setup() {
    const $route = useRoute()
    const { handleErrorReq } = useErrorHandling()

    const {
      data: fusionnables,
      pending,
      error,
      refresh,
    } = await useHttp('/management/identities/duplicates', {
      method: 'GET',
      query: computed(() => $route.query),
      transform: (result: any) => {
        return result.data.map((i) => {
          return {
            k: i.k,
            id1: i.data.at(0)._id,
            uid1: i.data.at(0).uid,
            cn1: i.data.at(0).cn,
            employeeNumber1: i.data.at(0).employeeNumber,
            departmentNumber1: i.data.at(0).departmentNumber.join(','),
            if1: i.data.at(0).ignoreFusion,

            id2: i.data.at(1)._id,
            uid2: i.data.at(1).uid,
            cn2: i.data.at(1).cn,
            employeeNumber2: i.data.at(1).employeeNumber,
            departmentNumber2: i.data.at(1).departmentNumber.join(','),
            if2: i.data.at(1).ignoreFusion,
          }
        })
      },
    })

    return {
      fusionnables,
      refresh,
      pending,
      error,
      handleErrorReq,
    }
  },
  computed: {
    includeIgnoredFilter(): string {
      return (this.$route.query['includeIgnored'] as string) || '0'
    },
  },
  methods: {
    updateIncludeIgnoredFilter(selection: { value: string | null }): void {
      const query = {
        ...this.$route.query,
      }

      if (!selection.value) {
        delete query['includeIgnored']
      } else {
        query['includeIgnored'] = selection.value
      }

      this.$router.replace({
        query,
      })
    },
    isIgnored(row) {
      if (row.if1 && row.if1.includes(row.id2)) {
        return true
      }
      if (row.if2 && row.if2.includes(row.id1)) {
        return true
      }
      return false
    },
    async unignoreFusion(ids: string[]) {
      this.$q
        .dialog({
          title: 'Réactiver la fusion pour ces identités',
          message: "Voulez-vous vraiment réactiver la fusion pour ces identités ? Les identités seront à nouveau proposées comme doublons l'une de l'autre. ",
          persistent: true,
          html: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Appliquer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          try {
            await this.$http.post(`/management/identities/unignore-fusion/`, {
              body: JSON.stringify({ ids }),
            })
            this.refresh()
            this.$q.notify({
              type: 'positive',
              message: 'Identité réactivée pour la fusion avec succès',
            })
          } catch (error: any) {
            this.handleErrorReq({ error })
            console.error('There was an error!', error)
          }
        })
    },
    async ignoreFusion(ids: string[]) {
      this.$q
        .dialog({
          title: 'Ignorer la fusion pour ces identités',
          message:
            "Voulez-vous vraiment ignorer la fusion pour ces identités ? Cette action est irréversible. Les identités ne seront plus proposées comme doublons l'une de l'autre. ",
          persistent: true,
          html: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Appliquer',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          try {
            await this.$http.post(`/management/identities/ignore-fusion/`, {
              body: JSON.stringify({ ids }),
            })
            this.refresh()
            this.$q.notify({
              type: 'positive',
              message: 'Identité ignorée pour la fusion avec succès',
            })
          } catch (error: any) {
            this.handleErrorReq({ error })
            console.error('There was an error!', error)
          }
        })
    },
    async edit(id, colorClass) {
      try {
        const res = await this.$http.get(`/management/identities/` + id, {
          method: 'get',
        })

        this.identity = { ...res._data?.data }
        this.validations = { ...res._data?.data.additionalFields?.validations }
        this.cnColor = colorClass
        this.cn = this.identity?.inetOrgPerson?.cn
        this.editForm = true
      } catch (error: any) {
        this.handleErrorReq({ error })
        console.error('There was an error!', error)
      }
    },

    async fusion(id1, id2) {
      this.$q
        .dialog({
          title: 'Fusion des deux identités',
          message: 'Voulez-vous fusionner ces deux identités ?',
          persistent: true,
          html: true,
          ok: {
            push: true,
            color: 'positive',
            label: 'Fusionner',
          },
          cancel: {
            push: true,
            color: 'negative',
            label: 'Annuler',
          },
        })
        .onOk(async () => {
          const data: any = await this.$http
            .post('/management/identities/fusion', {
              body: JSON.stringify({ id1: id1, id2: id2 }),
            })
            .catch((error) => {
              this.handleErrorReq({ error })
              console.error('There was an error!', error)
            })
          this.edit(data._data.newId, 'dark')
        })
    },

    async submit() {
      try {
        const res = await this.$http.patch(`/management/identities/` + this.identity._id, {
          body: this.identity,
        })
        this.refresh()
        this.closeModal()
        this.$q.notify({
          type: 'positive',
          message: 'Identité mise à jour avec succès',
        })
      } catch (error: any) {
        this.validations = error.response?._data?.validations || {}
        this.handleErrorReq({ error })
        console.error('There was an error!', error)
      }
    },
    closeModal() {
      this.editForm = false
      this.identity = {}
      this.validations = {}
      this.refresh()
    },
    async deleteDialog(id) {
      this.$q
        .dialog({
          title: 'supprimer cette identité',
          message: 'Voulez-vous supprimer cette identité ?',
          persistent: true,
          html: true,
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
          const data = await this.deleteIdentity(id)
          this.refresh()
        })
    },
    async deleteIdentity(id) {
      await this.$http
        .post('/core/backends/delete', {
          body: {
            payload: [id],
          },
        })
        .catch((error) => {
          console.error('There was an error!', error)
        })
    },
  },
})
</script>

<style scoped>
::v-deep .q-table .leftid {
  color: white;
  background: green !important;
}

::v-deep .q-table .leftidlight {
  color: black;
  background: #cfe4d4 !important;
}

::v-deep .q-table .rightid {
  color: white;
  background: darkred !important;
}

::v-deep .q-table .rightidlight {
  color: black;
  background: #ecd6d6 !important;
}

::v-deep .q-table td.seplight {
  border-left: 3px solid rgba(0, 0, 0, 0.12) !important;
  border-right: 3px solid rgba(0, 0, 0, 0.12) !important;
  width: 50px;
}

::v-deep .q-dark .q-table td.seplight {
  border-left: 3px solid rgba(255, 255, 255, 0.28) !important;
  border-right: 3px solid rgba(255, 255, 255, 0.28) !important;
}

::v-deep .q-dark .q-table .leftid {
  background: darkgreen !important;
}
::v-deep .q-dark .q-table .leftidlight {
  color: white;
  background: #253027 !important;
}

::v-deep .q-dark .q-table .rightidlight {
  color: white;
  background: #362124 !important;
}

::v-deep .q-dark .q-table .rightid {
  background: darkred !important;
}
</style>
