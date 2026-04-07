<template lang="pug">
q-dialog(
  ref="dialogRef",
  @hide="onDialogHide",
  maximized
)
  q-card.q-dialog-plugin.column.fit(style="overflow: hidden;")
    q-toolbar.bg-primary(dense)
      q-toolbar-title.text-white Envoyer un mail
      q-space
      q-btn(icon="mdi-close" flat round dense color="white" @click="cancelSync")
    q-separator
    q-splitter.col(
      v-if="q.screen.gt.sm"
      v-model="splitterModel"
      :limits="[25, 70]"
      style="min-height: 0;"
    )
      template(#before)
        .q-pa-md.overflow-auto(style="height: 100%;")
          p.text-body2(v-if="showSendAll") {{ introText }}
          q-checkbox(
            v-if="showSendAll"
            v-model="initAllIdentities"
            :label="checkboxLabel"
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
              color="primary"
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
              label="Rafraîchir l’aperçu"
              color="primary"
              flat
              dense
              :loading="previewLoading"
              @click="refreshPreview"
            )
          q-card(flat bordered class="col" style="min-height: 0; overflow: hidden;")
            .col.overflow-auto(style="min-height: 0;")
              iframe(
                v-if="previewHtml"
                :srcdoc="previewHtml"
                style="border: 0; width: 100%; height: 100%;"
              )
              .fit.row.items-center.justify-center(v-else)
                q-spinner-dots(color="primary" size="40px" v-if="previewLoading")
                q-banner.bg-grey-2.text-grey-9(v-else)
                  | Aucun aperçu disponible.

    .row.col(v-else style="min-height: 0;")
      .col-12.q-pa-md.overflow-auto
        p {{ mainText }}
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
            color="primary"
            flat
            dense
            @click="addVar"
          )

        q-separator.q-my-md
        q-checkbox(
          v-if="showSendAll"
          v-model="initAllIdentities"
          :label="checkboxLabel"
        )

      .col-12.bg-grey-1.column(style="min-height: 320px; overflow: hidden;")
        q-bar(flat)
          .text-subtitle2 Aperçu
          q-space
          q-btn(
            icon="mdi-refresh"
            label="Rafraîchir l’aperçu"
            color="primary"
            flat
            dense
            :loading="previewLoading"
            @click="refreshPreview"
          )
        q-card(flat bordered class="col" style="min-height: 0; height: 100%; overflow: hidden;")
          .col.overflow-auto(style="min-height: 0;")
            iframe(
              v-if="previewHtml"
              :srcdoc="previewHtml"
              style="border: 0; width: 100%; height: 100%;"
            )
            .fit.row.items-center.justify-center(v-else)
              q-spinner-dots(color="primary" size="40px" v-if="previewLoading")
              q-banner.bg-grey-2.text-grey-9(v-else)
                | Aucun aperçu disponible.

    q-separator
    q-card-actions.bg-white(style="position: sticky; bottom: 0; z-index: 2;")
      q-space
      q-btn(color="positive" label="Valider" @click="syncIdentities")
      q-btn(color="negative" label="Annuler" @click="cancelSync")
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, watch } from 'vue'
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

const q = useQuasar()
const splitterModel = ref(42)

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

const { dialogRef, onDialogHide, onDialogOK, onDialogCancel } = useDialogPluginComponent()
</script>
