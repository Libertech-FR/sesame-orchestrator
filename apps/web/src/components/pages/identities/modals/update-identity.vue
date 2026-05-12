<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
  transition-show="scale",
  transition-hide="scale",
)
  q-card.update-identity-dialog-card(flat bordered)
    q-card-section.update-identity-dialog-header.row.items-center.no-wrap.bg-orange-8.text-white
      q-avatar(round color="white" text-color="orange-8" icon="mdi-account-sync" size="32px")
      .column.q-ml-md.col
        .text-h6.text-weight-medium Mettre à synchroniser
        .text-caption(style="opacity: 0.92") Les comptes sélectionnés passeront à l'état « À synchroniser »
    q-separator
    q-card-section.update-identity-dialog-body
      .update-identity-dialog-body-top
        p.text-body2.update-identity-lede {{ mainText }}
        .row.items-center.no-wrap.q-mb-sm
          q-icon(color="orange-8" name="mdi-account-multiple-outline" size="22px")
          .text-subtitle1.q-ml-sm.text-weight-medium Identités sélectionnées
          q-space
          q-badge(color="orange-8" text-color="white" rounded) {{ selectedRows.length }}
        q-banner(
          v-if="selectedRows.length === 0"
          dense
          rounded
          class="bg-amber-2 text-dark"
        )
          span Aucune identité dans la sélection. Fermez cette fenêtre et cochez des lignes dans le tableau.
      .identity-list-wrap(v-if="selectedRows.length > 0" :class="listWrapClass")
        q-list(dense separator padding)
          q-item.update-identity-list-item(
            v-for="item in identityListItems"
            :key="item.key"
          )
            q-item-section(side)
              q-avatar(:color="item.avatarColor" text-color="white" size="36px") {{ item.initials }}
            q-item-section
              q-item-label.text-weight-medium(lines="2") {{ item.label }}
              q-item-label.text-caption.text-grey-6(lines="1" style="font-family: ui-monospace, monospace") {{ item.idShort }}
      .update-identity-dialog-body-footer
        q-separator.q-my-md
        q-checkbox(
          dense
          color="orange-8"
          v-model="syncAllIdentities",
          :label="checkboxLabel",
        )
    q-card-actions.identity-modal-actions(align="right")
      q-btn.identity-modal-btn-cancel(
        outline
        color="grey-8"
        no-caps
        padding="sm lg"
        label="Annuler"
        @click="cancelSync"
      )
      q-btn(
        unelevated
        no-caps
        padding="sm lg"
        color="positive"
        icon-right="mdi-check"
        label="Valider"
        :disable="selectedRows.length === 0"
        @click="syncIdentities"
      )
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useDialogPluginComponent, useQuasar } from 'quasar'

const props = defineProps({
  selectedIdentities: {
    type: Array,
    default: () => [],
  },
  identityTypesName: {
    type: String,
    required: true,
  },
  allIdentitiesCount: {
    type: Number,
    default: 0,
  },
})

defineEmits([...useDialogPluginComponent.emits])

const AVATAR_COLORS = ['orange-8', 'teal', 'indigo', 'deep-orange', 'purple', 'cyan', 'brown']

function idToString(id: unknown): string {
  if (id == null) return ''
  if (typeof id === 'string') return id
  if (typeof id === 'object' && id !== null && '$oid' in (id as Record<string, unknown>)) {
    return String((id as Record<string, unknown>).$oid)
  }
  return String(id)
}

function strOrJoin(v: unknown): string {
  if (v == null) return ''
  if (typeof v === 'string') return v.trim()
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === 'string' ? x.trim() : x != null ? String(x).trim() : ''))
      .filter(Boolean)
      .join(' ')
  }
  return String(v).trim()
}

function buildIdentityLabel(row: Record<string, unknown>): string {
  const p = row?.inetOrgPerson as Record<string, unknown> | undefined
  if (p && typeof p === 'object') {
    const fromCn = strOrJoin(p.cn)
    if (fromCn) return fromCn
    const dn = strOrJoin(p.displayName)
    if (dn) return dn
    const gn = strOrJoin(p.givenName)
    const sn = strOrJoin(p.sn)
    if (gn || sn) return [gn, sn].filter(Boolean).join(' ')
    const mail = strOrJoin(p.mail)
    if (mail) return mail
    const uid = strOrJoin(p.uid)
    if (uid) return uid
  }
  const id = idToString(row?._id)
  if (id) return `Identité ${id.length > 14 ? `${id.slice(0, 14)}…` : id}`
  return 'Identité (sans identifiant)'
}

function initialsFromLabel(label: string): string {
  const t = label.trim()
  if (!t) return '?'
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] || ''
    const b = parts[1][0] || ''
    return `${a}${b}`.toUpperCase()
  }
  if (t.length >= 2) return t.slice(0, 2).toUpperCase()
  return t.charAt(0).toUpperCase()
}

function shortId(id: string): string {
  if (!id) return '—'
  if (id.length <= 22) return id
  return `${id.slice(0, 10)}…${id.slice(-8)}`
}

const selectedRows = computed(() => {
  const raw = props.selectedIdentities
  if (!Array.isArray(raw)) return [] as Record<string, unknown>[]
  return raw as Record<string, unknown>[]
})

/* eslint-disable @typescript-eslint/no-unused-vars -- utilisés dans le template Pug (parser ESLint) */
const $q = useQuasar()

const listWrapClass = computed(() => ($q.dark.isActive ? 'identity-list-wrap--dark' : 'identity-list-wrap--light'))

const identityListItems = computed(() => {
  return selectedRows.value.map((row, idx) => {
    const label = buildIdentityLabel(row)
    const id = idToString(row?._id)
    return {
      key: `${id || 'noid'}_${idx}`,
      label,
      idShort: shortId(id),
      initials: initialsFromLabel(label),
      avatarColor: AVATAR_COLORS[idx % AVATAR_COLORS.length],
    }
  })
})

const mainText = computed(
  () =>
    `Vous allez placer ${selectedRows.value.length} identité${selectedRows.value.length > 1 ? 's' : ''} dans l'état « À synchroniser » (statut actuel : « ${props.identityTypesName} »). Vérifiez la liste puis confirmez.`,
)

const checkboxLabel = computed(() => {
  return `Tout passer à « À synchroniser » pour le filtre actuel (${props.allIdentitiesCount} identité${props.allIdentitiesCount > 1 ? 's' : ''})`
})

const syncAllIdentities = ref(false)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const syncIdentities = () => {
  onDialogOK({ syncAllIdentities: syncAllIdentities.value })
}

const cancelSync = () => {
  onDialogCancel()
}
/* eslint-enable @typescript-eslint/no-unused-vars */
</script>

<style scoped>
.update-identity-dialog-card {
  min-width: 340px;
  max-width: min(520px, 96vw);
  display: flex;
  flex-direction: column;
  max-height: min(580px, 88vh);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.14);
}

.body--dark .update-identity-dialog-card {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
}

.update-identity-dialog-header {
  padding: 1rem 1.25rem;
}

.update-identity-dialog-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
}

.update-identity-dialog-body-top {
  flex-shrink: 0;
}

.update-identity-dialog-body-footer {
  flex-shrink: 0;
}

.update-identity-lede {
  line-height: 1.55;
  margin-bottom: 1rem;
  opacity: 0.92;
}

.identity-list-wrap--light {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.identity-list-wrap--dark {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.identity-list-wrap--light,
.identity-list-wrap--dark {
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 10px;
  overflow-x: hidden;
  overflow-y: auto;
}

.update-identity-list-item {
  border-radius: 8px;
  margin-bottom: 2px;
  transition: background-color 0.15s ease;
}

.identity-list-wrap--light .update-identity-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.identity-list-wrap--dark .update-identity-list-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.identity-modal-actions {
  padding: 0.5rem 1rem 1rem;
  background: rgba(0, 0, 0, 0.02);
}

.body--dark .identity-modal-actions {
  background: rgba(255, 255, 255, 0.04);
}

</style>
