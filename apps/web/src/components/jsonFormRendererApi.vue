<template lang="pug">
div
  //- pre(v-html="JSON.stringify({ data }, null, 2)")
  json-forms(
    :ajv="customAjv.value"
    :i18n="i18n"
    :data="data"
    :schema="schema"
    :uischema="uischema"
    :renderers="renderers"
    validationMode="ValidateAndShow"
    :additionalErrors="getSchemaValidations"
    @change="onChange"
  )
</template>

<script setup lang="ts">
import { JsonForms } from '@jsonforms/vue'
import { defaultStyles, mergeStyles, vanillaRenderers } from '@jsonforms/vue-vanilla'

import type { JsonFormsChangeEvent } from '@jsonforms/vue'
import { QuasarJsonformRenderer } from './quasar-jsonform'
import { computed, provide, ref } from 'vue'
import { useFetch } from 'nuxt/app'
import localize from 'ajv-i18n'
import type { ErrorObject } from 'ajv'
import ajvErrors from 'ajv-errors'
import { createAjv } from '@jsonforms/core'
import type { components, operations } from '#build/types/service-api'
import def from 'ajv-i18n'
type Identity = components['schemas']['IdentitiesDto'] & { _id: string }

const customStyle = mergeStyles(defaultStyles, {
  control: {
    input: 'inputstyle',
    error: 'errorstyle',
  },
})

provide('styles', customStyle)

const renderers = Object.freeze([
  //...vanillaRenderers,
  ...QuasarJsonformRenderer,
  // Add custom renderers here
])

const props = defineProps({
  schemaName: {
    type: String,
    default: '',
  },
  validations: {
    type: Object || null,
    default: {},
  },
  isNew: {
    type: Boolean,
    default: false,
  },
})

const validations = defineModel('validations', {
  type: Object,
  default: {},
})

const createTranslator = (locale) => (key: string, defaultMessage: string | undefined, context: { error: ErrorObject }) => {
  const regex = /^(?!.*\s)([a-zA-Z0-9_-]+)(\.[a-zA-Z0-9_-]+)*$/
  if (regex.test(key) || defaultMessage || !context.error.schema) {
    return defaultMessage
  }

  console.debug('Translating', key, 'with context', context)

  const err = [context.error]
  localize[locale](err)

  return err[0].message
}

const i18n = ref({
  locale: 'fr',
  translate: computed(() => createTranslator('fr')),
})

const customAjv = ref(
  createAjv({
    allErrors: true,
    verbose: true,
    strict: false,
  }),
)

const data = defineModel('data', {
  type: Object,
  // required: true,
})

function onChange(event: JsonFormsChangeEvent) {
  data.value = event.data

  // console.log('onChange', event)

  if (!event.data) {
    console.error('error', event.errors)
    throw createError({
      message: 'Data is empty',
      status: 500,
    })
  }
}

const getSchemaValidations = computed(() => {
  if (!props.validations || !props.validations[props.schemaName]) {
    return []
  }
  const errorObject: ErrorObject[] = []
  let validationList = props.validations[props.schemaName]
  for (const key in validationList) {
    errorObject.push({
      message: validationList[key],
      instancePath: `/${key}`,
      keyword: 'type',
      params: {},
    } as any)
  }
  return errorObject
})

const mode = computed(() => {
  return props.isNew ? 'create' : 'update'
})

const {
  data: result,
  pending,
  error,
  refresh,
} = await useHttp<any>(`/management/identities/validation/${props.schemaName}`, {
  method: 'GET',
})

const identityForm = inject('identityForm') as Ref<any>
const employeeType = computed(() => {
  //console.log('employeeType', identityForm.value?.inetOrgPerson?.employeeType);
  return identityForm.value?.inetOrgPerson?.employeeType || 'LOCAL'
})

const {
  data: resultUi,
  pending: pendingUi,
  error: errorUi,
  refresh: refreshUi,
} = await useHttp<any>(`/management/identities/jsonforms/${props.schemaName}`, {
  method: 'POST',
  params: {
    mode,
  },
  query: {
    mode,
  },
  watch: [employeeType],
  body: {
    employeeType,
  },
})

// const schema = ref({ ...result.value.data });
// const uischema = ref({ ...resultUi.value.data });
const schema = computed(() => result.value?.data)
const uischema = computed(() => resultUi.value?.data)
</script>

<style>
.horizontal-layout {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: space-around;
  justify-items: center;
}

.horizontal-layout-item {
  flex: 1;
  min-width: 0;
  width: calc(33.333% - 10px);
  height: 100px;
  margin-right: 15px;
  justify-content: center;
}

.horizontal-layout-item:last-child {
  margin-right: 0;
}

.vertical-layout {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  justify-content: space-around;
  justify-items: flex-start;
}

.inputstyle {
  padding: 10px 15px;
  font-size: 16px;
  border: 1px solid #ced4da;
  /* Couleur de bordure légère */
  border-radius: 5px;
  /* Coins arrondis */
  outline: none;
  /* Supprime le contour par défaut lors de la sélection */
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  /* Légère ombre pour un effet en profondeur */
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
  /* Transition douce pour l'interaction */
}

.inputstyle:focus {
  border-color: #007bff;
  /* Changement de couleur de bordure pour l'état focus */
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
  /* Ombre extérieure pour indiquer le focus */
}

.errorstyle {
  border-color: red;
  color: red;
  /* Set border color to red for error */
}

.description {
  display: none;
}
</style>
