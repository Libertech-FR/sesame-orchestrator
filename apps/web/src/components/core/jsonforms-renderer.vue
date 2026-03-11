<template lang="pug">
  q-card-section.q-pr-sm
    div(v-if="!schema || !uischema")
      p Debug: schema={{ !!schema }}, uischema={{ !!uischema }}
      p Debug: pending={{ pending }}, error={{ error }}
    client-only
      json-forms(
        v-if="schema && uischema"
        :key="jsonFormsInstanceKey"
        @change="onChange"
        @error="onJsonFormsError"
        validationMode="ValidateAndShow"
        :data="modelValue"
        :schema="schema"
        :uischema="uischema"
        :renderers="renderers"
        :additionalErrors="getSchemaValidations"
        :readonly="readonlyRenderer"
        :ajv="customAjv"
        :config="config"
        :i18n="i18n"
      )
</template>

<script lang="ts">
import { JsonForms } from '@jsonforms/vue'
import { quasarRenderers } from '~/jsonforms/renderers'
import { createAjv } from '~/jsonforms/utils/validator'
import type { ErrorObject } from 'ajv'
// import localize from 'ajv-i18n/localize'
import { useErrorHandling } from '~/composables/useErrorHandling'

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
    schemaBodyParams: {
      type: Object,
      default: () => ({}),
    },
    schemaName: {
      type: String,
    },
    modelValue: {
      type: Object,
      default: () => ({}),
    },
    entityId: {
      type: [String, Number],
      default: null,
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
  setup(props) {
    const renderers = Object.freeze([...quasarRenderers])
    const { $http } = useNuxtApp()

    const createTranslator = (locale: string) => {
      return (key: string, defaultMessage: string | undefined, context: { error: ErrorObject }) => {
        return defaultMessage
      }
    }

    if (!props.schemaName) {
      return {
        schema: computed(() => props.manualSchema),
        uischema: computed(() => props.manualUiSchema),
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
    } = useHttp<any>(`${props.baseUrlValidation}${props.schemaName}`, {
      method: 'GET',
    })

    const schemaBodyParamsSnapshot = computed(() => JSON.stringify(props.schemaBodyParams ?? {}))
    const schemaBodyParams = computed(() => JSON.parse(schemaBodyParamsSnapshot.value))
    const resultUi = ref<any>(null)
    const pendingUi = ref(false)
    const errorUi = ref<any>(null)
    let fetchUiRequestId = 0

    const refreshUi = async () => {
      const requestId = ++fetchUiRequestId
      pendingUi.value = true
      errorUi.value = null
      try {
        const response = await $http.$post(`${props.baseUrlSchema}${props.schemaName}`, {
          query: {
            mode: props.mode,
          },
          body: schemaBodyParams.value,
        })

        // Ignore stale responses when multiple requests overlap.
        if (requestId === fetchUiRequestId) {
          resultUi.value = response
        }
      } catch (error: any) {
        if (requestId === fetchUiRequestId) {
          errorUi.value = error
        }
      } finally {
        if (requestId === fetchUiRequestId) {
          pendingUi.value = false
        }
      }
    }

    watch([() => props.schemaName, () => props.mode, schemaBodyParamsSnapshot], refreshUi, { immediate: true })

    const schema = computed(() => result.value?.data)
    const uischema = computed(() => resultUi.value?.data ?? resultUi.value)

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
    onJsonFormsError(error: any) {
      console.error('[JsonForms] Rendering error:', error)
    },
  },
  errorCaptured(err: any, instance: any, info: any) {
    console.error('[JsonForms] Error captured:', err, info, instance?.$options?.name)
    return false
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
    jsonFormsInstanceKey(): string {
      return [this.schemaName || 'manual', this.mode, this.entityId || this.$route.fullPath].join(':')
    },
  },
})
</script>
