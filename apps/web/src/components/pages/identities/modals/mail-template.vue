<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
  maximized,
  transition-show="scale",
  transition-hide="scale",
)
  q-card.mail-template-card.column.fit(flat bordered)
    q-card-section.identity-modal-header.row.items-center.no-wrap.bg-teal-7.text-white
      q-avatar(round color="white" text-color="teal-7" icon="mdi-email-multiple" size="32px")
      .column.q-ml-md.col
        .text-h6.text-weight-medium Envoyer un mail
        .text-caption(style="opacity: 0.92") Template, variables et aperçu avant envoi
      q-btn(icon="mdi-close" flat round dense color="white" @click="cancelSync")
    q-separator
    q-card-section.mail-template-split-wrap.col.column(flat style="min-height: 0; flex: 1 1 auto; padding: 0;")
      q-splitter.col(
        v-if="q.screen.gt.md"
        v-model="splitterModel"
        :limits="[25, 70]"
        style="min-height: 0; height: 100%; flex: 1 1 auto;"
      )
        template(#before)
          .q-pa-md.overflow-auto(style="height: 100%;")
            p.text-body2(v-if="showSendAll") {{ introText }}
            q-checkbox(
              v-if="showSendAll"
              v-model="initAllIdentities"
              :label="checkboxLabel"
              color="teal-7"
              dense
            )
            q-separator.q-my-md(v-if="showSendAll")

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

      .column.col(v-else style="min-height: 0;")
        .col.q-pa-md.overflow-auto(style="min-height: 0;")
          p.text-body2.text-weight-medium.q-mb-sm {{ mainText }}
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
          q-checkbox(
            v-if="showSendAll"
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
        unelevated
        no-caps
        padding="sm lg"
        color="positive"
        icon-right="mdi-send"
        label="Envoyer"
        @click="syncIdentities"
      )
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
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

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any -- template Pug */
const q = useQuasar()
const splitterModel = ref(42)

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()

const mainText = computed(
  () => `Vous êtes sur le point d'envoyer un mail à ${props.selectedIdentities.length} identités "${props.identityTypesName}". Voulez-vous continuer ?`,
)

const introText = computed(() => {
  if (showSendAll.value) {
    return `Vous êtes sur le point d'envoyer un mail à ${props.selectedIdentities.length} identités "${props.identityTypesName}". Vous pouvez aussi choisir de l'envoyer à toutes les identités synchronisées (${props.allIdentitiesCount}).`
  }
  return `Vous êtes sur le point d'envoyer un mail à ${props.selectedIdentities.length} identités "${props.identityTypesName}".`
})

const checkboxLabel = computed(() => {
  return `Envoyer le mail à toutes les identités synchronisées (${props.allIdentitiesCount})`
})

const showSendAll = computed(() => {
  const total = Number(props.allIdentitiesCount || 0)
  const selected = Array.isArray(props.selectedIdentities) ? props.selectedIdentities.length : 0
  return total > Math.max(selected, 1)
})

const initAllIdentities = ref(false)
const templateName = ref<string>('')
const templates = ref<{ label: string; value: string }[]>([])
const templatesLoading = ref(false)
const previewHtml = ref('')
const previewLoading = ref(false)
const previewObjectUrl = ref('')
const variablesRows = ref<{ key: string; value: string }[]>([])
const availableVariables = ref<{ key: string; label?: string; description?: string; example?: string; defaultValue?: unknown }[]>([])

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
    if (!k) continue
    out[k] = String(row.value ?? '')
  }
  return out
})

const variablesToSend = computed(() => {
  const base: Record<string, string> = {}

  // Toujours envoyer les variables déclarées dans la config (avec leur défaut)
  for (const v of availableVariables.value) {
    const key = String(v?.key || '').trim()
    if (!key) continue
    base[key] = v.defaultValue !== undefined && v.defaultValue !== null ? String(v.defaultValue) : ''
  }

  return {
    ...base,
    ...variablesObject.value,
  }
})

async function fetchTemplates() {
  templatesLoading.value = true
  try {
    const res = await (useNuxtApp() as any).$http.get('/management/mail/templates', { method: 'GET' })
    const list = res?._data?.data || []
    templates.value = Array.isArray(list) ? list.map((t: string) => ({ label: t, value: t })) : []
  } finally {
    templatesLoading.value = false
  }
}

async function fetchTemplatesConfig() {
  try {
    const res = await (useNuxtApp() as any).$http.get('/management/mail/templates/config', { method: 'GET' })
    const vars = res?._data?.data?.variables || []
    availableVariables.value = Array.isArray(vars) ? vars : []
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
  await fetchTemplatesConfig()
  await fetchTemplates()
  if (templates.value.length && !templates.value.some((t) => t.value === templateName.value)) {
    templateName.value = templates.value[0].value
  }
  await refreshPreview()
})

watch(
  () => [templateName.value, variablesToSend.value],
  async () => {
    await refreshPreview()
  },
  { deep: true },
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
  onDialogOK({
    initAllIdentities: initAllIdentities.value,
    template: templateName.value,
    variables: variablesToSend.value,
  })
}

const cancelSync = () => {
  onDialogCancel()
}
/* eslint-enable @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
</script>

<style scoped>
.mail-template-card {
  overflow: hidden;
  border-radius: 0;
}

.mail-template-split-wrap {
  flex: 1 1 auto;
  min-height: 0;
}

.identity-modal-header {
  padding: 1rem 1.25rem;
  flex-shrink: 0;
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
