<template lang="pug">
  q-card-section.q-pr-sm
    json-forms(
      @change="onChange"
      validationMode="ValidateAndShow"
      :data="modelValue"
      :schema="schema"
      :uischema="uischema"
      :renderers="renderers"
      :additionalErrors="getSchemaValidations"
      :readonly="readonlyRenderer"
      :ajv="customAjv.value"
      :config="config"
      :i18n="i18n"
    )
</template>

<script lang="ts">
import { JsonForms } from '@jsonforms/vue'
import { quasarRenderers } from '../../jsonforms'
import { createAjv } from '@jsonforms/core'
import type { ErrorObject } from 'ajv'
import localize from 'ajv-i18n'

export default defineNuxtComponent({
  name: 'SesameCoreJsonformsRendererComponent',
  props: {
    mode: {
      type: String as () => 'create' | 'update',
      default: 'create',
    },
    manualSchema: {
      type: Object,
    },
    manualUiSchema: {
      type: Object,
    },
    baseUrlSchema: {
      type: String,
      default: '/management/identities/jsonforms/',
    },
    baseUrlValidation: {
      type: String,
      default: '/management/identities/validation/',
    },
    schemaName: {
      type: String,
    },
    modelValue: {
      type: Object,
      default: () => ({}),
    },
    validations: {
      type: Object || null,
      default: {},
    },
    readonly: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  components: {
    JsonForms,
  },
  setup({ mode, schemaName, manualSchema, manualUiSchema, modelValue, baseUrlValidation, baseUrlSchema }) {
    const renderers = Object.freeze([...quasarRenderers])
    const employeeType = computed(() => modelValue?.inetOrgPerson?.employeeType || 'LOCAL')

    if (!schemaName && (!manualSchema || !manualUiSchema)) {
      throw new Error('Either schemaName or manualSchema/manualUiSchema props must be provided')
    }

    const createTranslator = (locale) => (key: string, defaultMessage: string | undefined, context: { error: ErrorObject }) => {
      const regex = /^(?!.*\s)([a-zA-Z0-9_-]+)(\.[a-zA-Z0-9_-]+)*$/
      if (regex.test(key) || defaultMessage || !context.error.schema) {
        return defaultMessage
      }

      const err = [context.error]
      localize[locale](err)

      return err[0].message
    }

    if (!schemaName) {
      return {
        schema: computed(() => manualSchema),
        uischema: computed(() => manualUiSchema),
        pending: computed(() => false),
        error: computed(() => null),
        refresh: () => {},
        refreshUi: () => {},
        renderers,
        createTranslator,
      }
    }

    const {
      data: result,
      pending,
      error,
      refresh,
    } = useHttp<any>(`${baseUrlValidation}${schemaName}`, {
      method: 'GET',
    })

    const {
      data: resultUi,
      pending: pendingUi,
      error: errorUi,
      refresh: refreshUi,
    } = useHttp<any>(`${baseUrlSchema}${schemaName}`, {
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

    const schema = computed(() => result.value?.data)
    const uischema = computed(() => resultUi.value?.data)

    return {
      schema,
      uischema,
      renderers,
      refresh,
      refreshUi,
      createTranslator,
      pending: computed(() => pending.value || pendingUi.value),
      error: computed(() => error.value || errorUi.value),
    }
  },
  methods: {
    onChange(event: any) {
      this.$emit('update:modelValue', event.data)

      if (!event.data) {
        console.error('error', event.errors)
        throw createError({
          message: 'Data is empty',
          status: 500,
        })
      }
    },
  },
  computed: {
    customAjv() {
      return createAjv({
        allErrors: true,
        verbose: true,
        strict: false,
      })
    },
    i18n() {
      return {
        locale: 'fr',
        translate: computed(() => this.createTranslator('fr')),
      }
    },
    getSchemaValidations(): any[] {
      let validationList: any = []
      if (!this.schemaName) {
        validationList = this.validations || []
      } else {
        validationList = this.validations[this.schemaName] || []
      }

      const errorObject: ErrorObject[] = []
      for (const key in validationList) {
        errorObject.push({
          message: validationList[key],
          instancePath: `/${key}`,
          keyword: 'type',
          params: {},
        } as any)
      }

      return errorObject
    },
    readonlyRenderer(): boolean {
      return this.readonly || /1|true|on|yes/i.test(String(this.$route.query.readonly).toLowerCase())
    },
    config(): Record<string, any> {
      return {
        quasar: {
          'q-input': { dense: true },
          'q-select': { dense: true },
        },
      }
    },
  },
})
</script>
