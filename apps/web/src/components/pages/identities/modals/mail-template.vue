<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
  maximized,
  transition-show="scale",
  transition-hide="scale",
)
  q-card.mail-template-card.column.fit.no-wrap(flat bordered)
    q-card-section.identity-modal-header.row.items-center.no-wrap.bg-teal-7.text-white
      q-avatar(round color="white" text-color="teal-7" icon="mdi-email-multiple" size="32px")
      .column.q-ml-md.col
        .text-h6.text-weight-medium Envoyer un mail
        .text-caption(style="opacity: 0.92") Template, variables et aperçu avant envoi
      q-btn(icon="mdi-close" flat round dense color="white" @click="cancelSync")
    q-separator
    q-card-section.mail-template-split-wrap.column(flat style="min-height: 0; flex: 1 1 auto; padding: 0; width: 100%;")
      q-splitter(
        v-if="q.screen.gt.md"
        v-model="splitterModel"
        :limits="[25, 70]"
        style="min-height: 0; height: 100%; flex: 1 1 auto; width: 100%;"
      )
        template(#before)
          .q-pa-md.overflow-auto(style="height: 100%;")
            p.text-body2.identity-modal-lede.q-mb-md {{ mainText }}
            q-select(
              v-model="templateName"
              :options="templates"
              label="Template"
              hint="Sélectionnez un template"
              outlined
              dense
              emit-value
              map-options
              :loading="templatesLoading"
              color="teal-7"
            )
            q-banner.q-mt-md(
              v-if="isInternalTemplate"
              rounded
              dense
              class="bg-blue-1 text-grey-9"
            )
              template(#avatar)
                q-icon(name="mdi-eye-outline" color="primary")
              .text-body2
                | Mode lecture seule : template interne Sesame. L'aperçu est disponible ; l'envoi manuel n'est pas autorisé pour ce template.
            q-input.q-mt-md(
              v-if="!isInternalTemplate"
              v-model="mailSubject"
              label="Sujet du mail"
              hint="Sujet affiché par le client mail (obligatoire)"
              outlined
              dense
              color="teal-7"
              autocomplete="off"
            )
            q-banner.q-mt-md(
              v-if="!isInternalTemplate && mailPathsReady && recipientSourceOptions.length === 0"
              rounded
              dense
              class="bg-orange-1 text-grey-9"
            )
              template(#avatar)
                q-icon(name="mdi-cog-outline" color="orange-9")
              .text-body2
                | Pour envoyer un mail (template), configurez au moins un chemin JSON&nbsp;
                strong e-mail personnel
                |  ou&nbsp;
                strong e-mail principal
                |  dans&nbsp;
                strong Paramètres → Serveur SMTP
                | .
            q-select.q-mt-md(
              v-if="!isInternalTemplate && recipientSourceOptions.length > 1"
              v-model="recipientAddressSource"
              :options="recipientSourceOptions"
              label="Adresse du destinataire"
              hint="Chemin JSON défini dans Paramètres → Serveur SMTP"
              outlined
              dense
              emit-value
              map-options
              color="teal-7"
            )
            q-separator.q-my-md
            .text-subtitle2 Variables pré-construites
            .text-caption.text-grey-7
              | Ces variables proviennent de la config `mail_templates.yml` et sont envoyées quoi qu'il arrive. Pour les surcharger, ajoutez une variable additionnelle avec la même clé.
            .q-mt-sm(v-if="availableVariables.length")
              q-list(bordered separator dense)
                q-item(v-for="v in availableVariables" :key="v.key")
                  q-item-section
                    q-item-label
                      b {{ v.label || v.key }}
                      span.text-grey-7(v-if="v.label") &nbsp;({{ v.key }})
                    q-item-label(caption v-if="v.description") {{ v.description }}
                    q-item-label(caption v-if="v.example") Exemple: {{ v.example }}
                    q-item-label(caption v-if="v.defaultValue !== undefined") Défaut: {{ String(v.defaultValue) }}
            q-banner.bg-grey-2.text-grey-9.q-mt-sm(v-else)
              | Aucune variable pré-construite trouvée dans la configuration.

            q-separator.q-my-md
            .text-subtitle2 Variables additionnelles (optionnel)
            .text-caption.text-grey-7
              | Variables libres (clé/valeur) ajoutées au contexte du template.
            .q-mt-sm
              .row.q-col-gutter-sm.items-center(v-for="(row, idx) in variablesRows" :key="`var-${idx}`")
                q-input.col(
                  v-model="row.key"
                  label="Clé"
                  outlined
                  dense
                )
                q-input.col(
                  v-model="row.value"
                  label="Valeur"
                  outlined
                  dense
                )
                q-btn(
                  icon="mdi-delete"
                  color="negative"
                  flat
                  round
                  dense
                  @click="removeVar(idx)"
                )
              q-btn.q-mt-sm(
                icon="mdi-plus"
                label="Ajouter une variable"
                color="teal-7"
                flat
                dense
                @click="addVar"
              )

            q-separator.q-my-md
            .row.items-center.no-wrap.q-mb-sm
              q-icon(color="teal-7" name="mdi-account-multiple-outline" size="22px")
              .text-subtitle1.q-ml-sm.text-weight-medium Destinataires
              q-space
              q-badge(color="teal-7" text-color="white" rounded) {{ selectedRows.length }}
            q-banner(
              v-if="selectedRows.length === 0"
              dense
              rounded
              class="bg-amber-2 text-dark"
            )
              span Aucune identité dans la sélection.
            .identity-modal-list-wrap.mail-template-dest-in-form(
              v-if="selectedRows.length > 0"
              :class="listWrapClass"
            )
              q-list(dense separator padding)
                q-item.identity-modal-list-item(
                  v-for="item in identityListItems"
                  :key="item.key"
                )
                  q-item-section(side)
                    q-avatar(:color="item.avatarColor" text-color="white" size="36px") {{ item.initials }}
                  q-item-section
                    q-item-label.text-weight-medium(lines="2") {{ item.label }}
                    q-item-label.text-caption.text-grey-6(lines="1" style="font-family: ui-monospace, monospace") {{ item.idShort }}
            template(v-if="showSendAll")
              q-separator.q-my-md
              q-checkbox(
                v-model="initAllIdentities"
                :label="checkboxLabel"
                color="teal-7"
                dense
              )

        template(#after)
          .bg-grey-1.column(style="min-height: 0; height: 100%; overflow: hidden;")
            q-bar(flat)
              .text-subtitle2 Aperçu
              q-space
              q-btn(
                icon="mdi-refresh"
                label="Rafraîchir l'aperçu"
                color="teal-7"
                flat
                dense
                :loading="previewLoading"
                @click="refreshPreview"
              )
            q-card(flat bordered class="col" style="min-height: 0; overflow: hidden;")
              .col(style="min-height: 0; height: 100%;")
                object(
                  v-if="previewObjectUrl"
                  :data="previewObjectUrl"
                  type="text/html"
                  style="border: 0; width: 100%; height: 100%;"
                )
                .fit.row.items-center.justify-center(v-else)
                  q-spinner-dots(color="teal-7" size="40px" v-if="previewLoading")
                  q-banner.bg-grey-2.text-grey-9(v-else)
                    | Aucun aperçu disponible.

      .column(v-else style="min-height: 0; width: 100%;")
        .col.q-pa-md.overflow-auto(style="min-height: 0;")
          p.text-body2.identity-modal-lede.q-mb-md {{ mainText }}
          q-separator.q-my-md
          q-select(
            v-model="templateName"
            :options="templates"
            label="Template"
            hint="Sélectionnez un template"
            outlined
            dense
            emit-value
            map-options
            :loading="templatesLoading"
            color="teal-7"
          )
          q-banner.q-mt-md(
            v-if="isInternalTemplate"
            rounded
            dense
            class="bg-blue-1 text-grey-9"
          )
            template(#avatar)
              q-icon(name="mdi-eye-outline" color="primary")
            .text-body2
              | Mode lecture seule : template interne Sesame. L'aperçu est disponible ; l'envoi manuel n'est pas autorisé pour ce template.
          q-input.q-mt-md(
            v-if="!isInternalTemplate"
            v-model="mailSubject"
            label="Sujet du mail"
            hint="Sujet affiché par le client mail (obligatoire)"
            outlined
            dense
            color="teal-7"
            autocomplete="off"
          )
          q-banner.q-mt-md(
            v-if="!isInternalTemplate && mailPathsReady && recipientSourceOptions.length === 0"
            rounded
            dense
            class="bg-orange-1 text-grey-9"
          )
            template(#avatar)
              q-icon(name="mdi-cog-outline" color="orange-9")
            .text-body2
              | Pour envoyer un mail (template), configurez au moins un chemin JSON&nbsp;
              strong e-mail personnel
              |  ou&nbsp;
              strong e-mail principal
              |  dans&nbsp;
              strong Paramètres → Serveur SMTP
              | .
          q-select.q-mt-md(
            v-if="!isInternalTemplate && recipientSourceOptions.length > 1"
            v-model="recipientAddressSource"
            :options="recipientSourceOptions"
            label="Adresse du destinataire"
            hint="Chemin JSON défini dans Paramètres → Serveur SMTP"
            outlined
            dense
            emit-value
            map-options
            color="teal-7"
          )
          q-separator.q-my-md
          .text-subtitle2 Variables pré-construites
          .text-caption.text-grey-7
            | Ces variables proviennent de la config `mail_templates.yml` et sont envoyées quoi qu'il arrive. Pour les surcharger, ajoutez une variable additionnelle avec la même clé.
          .q-mt-sm(v-if="availableVariables.length")
            q-list(bordered separator dense)
              q-item(v-for="v in availableVariables" :key="v.key")
                q-item-section
                  q-item-label
                    b {{ v.label || v.key }}
                    span.text-grey-7(v-if="v.label") &nbsp;({{ v.key }})
                  q-item-label(caption v-if="v.description") {{ v.description }}
                  q-item-label(caption v-if="v.example") Exemple: {{ v.example }}
                  q-item-label(caption v-if="v.defaultValue !== undefined") Défaut: {{ String(v.defaultValue) }}
          q-banner.bg-grey-2.text-grey-9.q-mt-sm(v-else)
            | Aucune variable pré-construite trouvée dans la configuration.

          q-separator.q-my-md
          .text-subtitle2 Variables additionnelles (optionnel)
          .text-caption.text-grey-7
            | Variables libres (clé/valeur) ajoutées au contexte du template.
          .q-mt-sm
            .row.q-col-gutter-sm.items-center(v-for="(row, idx) in variablesRows" :key="`var-${idx}`")
              q-input.col(
                v-model="row.key"
                label="Clé"
                outlined
                dense
              )
              q-input.col(
                v-model="row.value"
                label="Valeur"
                outlined
                dense
              )
              q-btn(
                icon="mdi-delete"
                color="negative"
                flat
                round
                dense
                @click="removeVar(idx)"
              )
            q-btn.q-mt-sm(
              icon="mdi-plus"
              label="Ajouter une variable"
              color="teal-7"
              flat
              dense
              @click="addVar"
            )

          q-separator.q-my-md
          .row.items-center.no-wrap.q-mb-sm
            q-icon(color="teal-7" name="mdi-account-multiple-outline" size="22px")
            .text-subtitle1.q-ml-sm.text-weight-medium Destinataires
            q-space
            q-badge(color="teal-7" text-color="white" rounded) {{ selectedRows.length }}
          q-banner(
            v-if="selectedRows.length === 0"
            dense
            rounded
            class="bg-amber-2 text-dark"
          )
            span Aucune identité dans la sélection.
          .identity-modal-list-wrap.mail-template-dest-in-form(
            v-if="selectedRows.length > 0"
            :class="listWrapClass"
          )
            q-list(dense separator padding)
              q-item.identity-modal-list-item(
                v-for="item in identityListItems"
                :key="item.key"
              )
                q-item-section(side)
                  q-avatar(:color="item.avatarColor" text-color="white" size="36px") {{ item.initials }}
                q-item-section
                  q-item-label.text-weight-medium(lines="2") {{ item.label }}
                  q-item-label.text-caption.text-grey-6(lines="1" style="font-family: ui-monospace, monospace") {{ item.idShort }}
          template(v-if="showSendAll")
            q-separator.q-my-md
            q-checkbox(
              v-model="initAllIdentities"
              :label="checkboxLabel"
              color="teal-7"
              dense
            )

    q-separator
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
        v-if="isInternalTemplate"
        outline
        no-caps
        padding="sm lg"
        color="grey-7"
        icon-right="mdi-eye-outline"
        label="Aperçu seul — envoi non disponible"
        disable
        :title="sendButtonTitle"
      )
      q-btn(
        v-else
        unelevated
        no-caps
        padding="sm lg"
        color="positive"
        icon-right="mdi-send"
        label="Envoyer"
        :disable="!canSendMailTemplate"
        :title="sendButtonTitle"
        @click="syncIdentities"
      )
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
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
    required: true,
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

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- template Pug */
const q = useQuasar()
const splitterModel = ref(42)

const selectedRows = computed(() => {
  const raw = props.selectedIdentities
  if (!Array.isArray(raw)) return [] as Record<string, unknown>[]
  return raw as Record<string, unknown>[]
})

const listWrapClass = computed(() => (q.dark.isActive ? 'identity-modal-list-wrap--dark' : 'identity-modal-list-wrap--light'))

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

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const mainText = computed(() => {
  const n = selectedRows.value.length
  return `Vous êtes sur le point d'envoyer un mail à ${n} identité${n > 1 ? 's' : ''} « ${props.identityTypesName} ». Voulez-vous continuer ?`
})

const checkboxLabel = computed(() => {
  return `Envoyer le mail à toutes les identités synchronisées (${props.allIdentitiesCount})`
})

const SENDABLE_TEMPLATE_PREFIX = 'mail_'

function isSendableTemplateName(name: string): boolean {
  return String(name || '')
    .trim()
    .startsWith(SENDABLE_TEMPLATE_PREFIX)
}

const initAllIdentities = ref(false)
const templateName = ref<string>('')
const mailSubject = ref<string>('')
const templates = ref<{ label: string; value: string }[]>([])
const templatesLoading = ref(false)
const previewHtml = ref('')
const previewLoading = ref(false)
const previewObjectUrl = ref('')
const variablesRows = ref<{ key: string; value: string }[]>([])
const availableVariables = ref<{ key: string; label?: string; description?: string; example?: string; defaultValue?: unknown }[]>([])

const mailPaths = ref<{ personnel: string; principal: string }>({ personnel: '', principal: '' })
const mailPathsReady = ref(false)
const recipientAddressSource = ref<'principal' | 'personnel' | null>(null)

const isInternalTemplate = computed(() => {
  const name = String(templateName.value || '').trim()
  return name.length > 0 && !isSendableTemplateName(name)
})

const showSendAll = computed(() => {
  if (isInternalTemplate.value) {
    return false
  }
  const total = Number(props.allIdentitiesCount || 0)
  const selected = selectedRows.value.length
  return total > Math.max(selected, 1)
})

const recipientSourceOptions = computed(() => {
  const opts: { label: string; value: 'principal' | 'personnel' }[] = []
  if (mailPaths.value.personnel) {
    opts.push({ label: `E-mail personnel (${mailPaths.value.personnel})`, value: 'personnel' })
  }
  if (mailPaths.value.principal) {
    opts.push({ label: `E-mail principal (${mailPaths.value.principal})`, value: 'principal' })
  }
  return opts
})

const canSendMailTemplate = computed(
  () =>
    !isInternalTemplate.value &&
    mailPathsReady.value &&
    String(mailSubject.value || '').trim().length > 0 &&
    (recipientAddressSource.value === 'principal' || recipientAddressSource.value === 'personnel'),
)

const sendButtonTitle = computed(() => {
  if (canSendMailTemplate.value) {
    return ''
  }
  if (isInternalTemplate.value) {
    return 'Template interne Sesame : aperçu uniquement, envoi non autorisé.'
  }
  if (!mailPathsReady.value) {
    return 'Chargement des paramètres SMTP…'
  }
  if (String(mailSubject.value || '').trim().length === 0) {
    return 'Renseignez le sujet du mail.'
  }
  if (recipientSourceOptions.value.length === 0) {
    return 'Configurez au moins un chemin JSON (e-mail personnel ou principal) dans Paramètres → Serveur SMTP.'
  }
  return "Choisissez l'adresse du destinataire (e-mail personnel ou principal)."
})

const addVar = () => {
  variablesRows.value.push({ key: '', value: '' })
}

const removeVar = (idx: number) => {
  variablesRows.value.splice(idx, 1)
}

const variablesObject = computed(() => {
  const out: Record<string, string> = {}
  for (const row of variablesRows.value) {
    const k = String(row.key || '').trim()
    if (!k || k === 'subject') continue
    out[k] = String(row.value ?? '')
  }
  return out
})

const variablesToSend = computed(() => {
  const base: Record<string, string> = {}

  // Toujours envoyer les variables déclarées dans la config (avec leur défaut)
  for (const v of availableVariables.value) {
    const key = String(v?.key || '').trim()
    if (!key || key === 'subject') continue
    base[key] = v.defaultValue !== undefined && v.defaultValue !== null ? String(v.defaultValue) : ''
  }

  return {
    ...base,
    ...variablesObject.value,
  }
})

async function fetchMailPathsConfig() {
  mailPathsReady.value = false
  try {
    const res = await (useNuxtApp() as any).$http.get('/settings/mail/get', { method: 'GET' })
    const d = res?._data?.data || {}
    mailPaths.value = {
      personnel: String(d.recipientJsonPathEmailPersonnel || '').trim(),
      principal: String(d.recipientJsonPathEmailPrincipal || '').trim(),
    }
    const per = mailPaths.value.personnel
    const prin = mailPaths.value.principal
    if (prin && per) {
      recipientAddressSource.value = 'principal'
    } else if (prin) {
      recipientAddressSource.value = 'principal'
    } else if (per) {
      recipientAddressSource.value = 'personnel'
    } else {
      recipientAddressSource.value = null
    }
  } catch {
    mailPaths.value = { personnel: '', principal: '' }
    recipientAddressSource.value = null
  } finally {
    mailPathsReady.value = true
  }
}

async function fetchTemplates() {
  templatesLoading.value = true
  try {
    const res = await (useNuxtApp() as any).$http.get('/management/mail/templates', { method: 'GET' })
    const list = res?._data?.data || []
    templates.value = Array.isArray(list)
      ? list.map((t: string) => {
          const name = String(t || '').trim()
          const sendable = isSendableTemplateName(name)
          return {
            label: sendable ? name : `${name} (interne — aperçu seul)`,
            value: name,
          }
        })
      : []
  } finally {
    templatesLoading.value = false
  }
}

async function fetchTemplatesConfig() {
  try {
    const res = await (useNuxtApp() as any).$http.get('/management/mail/templates/config', { method: 'GET' })
    const vars = res?._data?.data?.variables || []
    availableVariables.value = Array.isArray(vars) ? vars.filter((v: { key?: string }) => String(v?.key || '').trim() !== 'subject') : []
  } catch {
    availableVariables.value = []
  }
}

async function refreshPreview() {
  previewLoading.value = true
  try {
    const identity = Array.isArray(props.selectedIdentities) && props.selectedIdentities.length > 0 ? props.selectedIdentities[0] : null
    const res = await (useNuxtApp() as any).$http.post('/management/mail/templates/preview', {
      body: {
        template: templateName.value,
        variables: {
          ...variablesToSend.value,
          subject: String(mailSubject.value || '').trim(),
          identity,
        },
      },
    })
    previewHtml.value = res?._data?.data?.html || ''
  } catch {
    previewHtml.value = ''
  } finally {
    previewLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchTemplatesConfig(), fetchTemplates(), fetchMailPathsConfig()])
  if (templates.value.length && !templates.value.some((t) => t.value === templateName.value)) {
    const firstSendable = templates.value.find((t) => isSendableTemplateName(t.value))
    templateName.value = firstSendable?.value ?? templates.value[0].value
  }
  await refreshPreview()
})

// Ne pas watcher variablesToSend (nouvel objet à chaque lecture) : boucle de re-renders + perte de focus/valeur sur q-input.
watchDebounced(
  [templateName, mailSubject, variablesRows, availableVariables],
  () => {
    void refreshPreview()
  },
  { debounce: 400, deep: true },
)

watch(
  previewHtml,
  (html) => {
    if (previewObjectUrl.value) URL.revokeObjectURL(previewObjectUrl.value)
    if (!html) {
      previewObjectUrl.value = ''
      return
    }
    const blob = new Blob([html], { type: 'text/html' })
    previewObjectUrl.value = URL.createObjectURL(blob)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (previewObjectUrl.value) URL.revokeObjectURL(previewObjectUrl.value)
})

const syncIdentities = () => {
  if (!canSendMailTemplate.value) {
    return
  }
  onDialogOK({
    initAllIdentities: initAllIdentities.value,
    template: templateName.value,
    subject: String(mailSubject.value || '').trim(),
    variables: variablesToSend.value,
    recipientAddressSource: recipientAddressSource.value,
  })
}

const cancelSync = () => {
  onDialogCancel()
}
/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
</script>

<style scoped>
/* q-card en colonne : la barre d'actions doit occuper toute la largeur en bas (évite qu'elle se comporte comme 3e colonne du q-splitter en row) */
/* Empêche le wrap Quasar (.column → flex-wrap:wrap) de pousser le pied en 2e colonne. */
.mail-template-card {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  overflow: hidden;
  border-radius: 0;
  width: 100%;
  min-width: 0;
}

.mail-template-card > :deep(.q-card__actions) {
  flex: 0 0 auto;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.mail-template-split-wrap {
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  width: 100%;
  max-width: 100%;
  height: 100%;
}

.mail-template-dest-in-form.identity-modal-list-wrap--light,
.mail-template-dest-in-form.identity-modal-list-wrap--dark {
  max-height: min(260px, 40vh);
}

.identity-modal-header {
  padding: 1rem 1.25rem;
  flex-shrink: 0;
}

.identity-modal-lede {
  line-height: 1.55;
  margin-bottom: 1rem;
  opacity: 0.92;
}

.identity-modal-list-wrap--light {
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(0, 0, 0, 0.08);
}

.identity-modal-list-wrap--dark {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.identity-modal-list-wrap--light,
.identity-modal-list-wrap--dark {
  flex: 1 1 auto;
  min-height: 0;
  border-radius: 10px;
  overflow-x: hidden;
  overflow-y: auto;
}

.identity-modal-list-item {
  border-radius: 8px;
  margin-bottom: 2px;
  transition: background-color 0.15s ease;
}

.identity-modal-list-wrap--light .identity-modal-list-item:hover {
  background-color: rgba(0, 0, 0, 0.04);
}

.identity-modal-list-wrap--dark .identity-modal-list-item:hover {
  background-color: rgba(255, 255, 255, 0.06);
}

.identity-modal-actions {
  padding: 0.5rem 1rem 1rem;
  background: rgba(0, 0, 0, 0.02);
  flex-shrink: 0;
}

.body--dark .identity-modal-actions {
  background: rgba(255, 255, 255, 0.04);
}

.preview-scroll {
  overflow: auto;
  -webkit-overflow-scrolling: touch;
}
</style>
