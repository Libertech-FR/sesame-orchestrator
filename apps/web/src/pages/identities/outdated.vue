<template lang="pug">
q-page.container
  q-table(
    flat bordered
    title="Identités dont l'invitation n'est plus valide"
    dense
    :rows="outdateds.data || []"
    :columns="columns"
    selection="multiple"
    :visible-columns="visibleColumns"
    v-model:selected="selected"
    row-key="_id"
    :rows-per-page-options="[20, 50, 100]"
    rows-per-page-label="Lignes par page"
    no-data-label="Aucune donnée"
    loading-label="Chargement..."
    no-results-label="Aucun résultat"
    :pagination-label="(firstRowIndex, endRowIndex, totalRowsNumber) => `${firstRowIndex}-${endRowIndex} sur ${totalRowsNumber} lignes`"
    :selected-rows-label="(numberOfRows) => `${numberOfRows} entrée(s) sélectionnée(s)`"
  )
    template(v-slot:)
    template(v-slot:top-left)
      q-btn(
        @click="openInitModale"
        :disable="selected.length === 0"
        color="primary"
        icon="mdi-email-sync"
        size="md"
        rounded
        flat
      )
        q-tooltip(
          class="text-body2"
          transition-show="scale"
          transition-hide="scale"
        ) Réenvoyer le mail d'invitation
</template>

<script lang="ts">
import { get } from 'radash'
import updateInitModale from '~/components/pages/identities/modals/update-init.vue'
import type { components } from '#build/types/service-api'

type Identities = components['schemas']['IdentitiesDto']

export default defineNuxtComponent({
  name: 'IdentitiesOutdatedPage',
  data() {
    return {
      selected: [] as Array<Identities>,
      columns: [] as Array<any>,
      visibleColumns: [] as Array<string>,
    }
  },
  async setup() {
    const {
      data: outdateds,
      pending,
      error,
      refresh,
    } = await useHttp<{ total: number; data: Identities[] }>('/management/passwd/ioutdated', {
      method: 'GET',
    })

    return {
      outdateds,
      pending,
      error,
      refresh,
    }
  },
  methods: {
    openInitModale() {
      this.$q
        .dialog({
          component: updateInitModale,
          componentProps: {
            selectedIdentities: this.selected,
            identityTypesName: name,
            allIdentitiesCount: this.outdateds?.total || 0,
          },
        })
        .onOk(async (data) => {
          data.initAllIdentities ? await this.sendInitToAllIdentities() : await this.sendInitToIdentity(this.selected)
        })
    },
    async sendInitToIdentity(identities: Identities[]) {
      const ids = identities.map((identity) => (identity as any)._id)
      const { data, error } = await useHttp(`/management/passwd/initmany`, {
        method: 'post',
        body: {
          ids,
        },
      })

      if (error.value) {
        this.$q.notify({
          message: error.value.data.message,
          color: 'negative',
        })
        return
      }

      this.$q.notify({
        message: `Les identités ont été mises à jour avec succès`,
        color: 'positive',
      })
      // emit('refresh')
      // emit('clear')
    },

    async sendInitToAllIdentities() {
      const { data: identities } = await useHttp<{ total: number; data: Identities[] }>('/management/passwd/ioutdated', {
        method: 'get',
      })

      if (!identities) {
        this.$q.notify({
          message: 'Aucune identité trouvée',
          color: 'negative',
        })
        return
      }
      this.sendInitToIdentity(identities.value?.data || [])
    },
  },
  async mounted() {
    try {
      const res = await this.$http.get('/management/identities/validation', {
        method: 'GET',
      })

      for (const scheme in res._data.data) {
        const enr = res._data.data[scheme]
        const base = enr.name === 'inetOrgPerson' ? 'inetOrgPerson' : `additionalFields.attributes.${enr.name}`

        if (enr.name === 'inetOrgPerson') {
          this.visibleColumns.push(...Object.keys(enr[enr.name].properties).map((key) => `${base}.${key}`))
        }

        const fields = Object.keys(enr[enr.name].properties).map((key) => ({
          name: `${base}.${key}`,
          field: (row) => get(row, `${base}.${key}`, ''),
          label: key,
          align: 'left',
        }))

        if (enr.name === 'inetOrgPerson') {
          this.columns.push(...fields)
        }
      }
    } catch (error) {
      console.error('There was an error!', error)
    }
  },
})
</script>
