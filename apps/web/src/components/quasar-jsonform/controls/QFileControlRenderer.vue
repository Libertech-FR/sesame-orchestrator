<template lang="pug">
//control-wrapper(v-bind="controlWrapper" :styles="styles" :isFocused="isFocused" :appliedOptions="appliedOptions")
div(style="cursor: pointer")
  //- @click="open"
    @update:model-value="onChangeControl"
  q-input(
    :id="control.id + '-input'"
    :disable="!control.enabled"
    :placeholder="appliedOptions.placeholder"
    :label="computedLabel"
    :model-value="control.data"
    :clearable="true"
    readonly
    @focus="isFocused = true"
    @blur="isFocused = false"
    :style="{paddingBottom: control.errors !== '' ? 'revert-layer' : 0}"
    filled
  )
    template(v-slot:prepend)
      q-icon(name="mdi-paperclip")
  q-card(style="border-radius: 0")
    q-img(:src="'/api/management/identities/photo/raw?' + photoUrlQuery.params" placeholder-src='/no-photo.jpg' fit='contain' height='400px')
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useFileDialog } from '@vueuse/core'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { isArray, isObject, isString, iterate } from 'radash'
import type { RendererProps } from '@jsonforms/vue'
import type { ControlElement } from '@jsonforms/core'
import { useQuasarControl } from '../util'
import { ControlWrapper } from '@jsonforms/vue-vanilla'

const QStringControlRenderer = defineComponent({
  name: 'q-string-control-renderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  inject: ['jsonforms'],
  setup(props: RendererProps<ControlElement>) {
    const {
      files,
      open,
      reset,
      onChange: onChangeFile,
    } = useFileDialog({
      accept: 'image/*',
      multiple: false,
      directory: false,
    })
    const config = useAppConfig()

    return {
      open,
      onChangeFile,
      photo: null,
      baseUrl: config.baseUrl,
      ...useQuasarControl(useJsonFormsControl(props), (value) => (isObject(value) ? (value as any).value : value || undefined)),
    }
  },
  methods: {
    onChangeControl(val) {
      console.log('val', val)
      debugger
      this.onChange([this.control?.uischema.options?.storage || 'data', val.name].join(':'))
    },
  },
  async mounted() {
    this.onChangeFile((files) => {
      this.onChangeControl(files?.length ? files[0] : null)
    })
  },
  computed: {
    computedLabel() {
      return this.control.label === undefined ? this.control.schema.title : this.control.label
    },
    photoUrlQuery() {
      const auth = useAuth()
      const query = new URLSearchParams()
      const employeeNumber = (this.jsonforms as any)?.core?.data?.employeeNumber
      const employeeType = (this.jsonforms as any)?.core?.data?.employeeType

      query.append('filters[:inetOrgPerson.employeeNumber]', isArray(employeeNumber) ? employeeNumber[0] : employeeNumber)
      query.append('filters[:inetOrgPerson.employeeType]', employeeType)

      if (auth.user?._id) query.append('id', `${auth.user?._id}`)
      if (auth.user?.sseToken) query.append('key', `${auth.user?.sseToken}`)

      return {
        params: query.toString(),
        employeeNumber,
        employeeType,
      }
    },
  },
})
export default QStringControlRenderer
</script>
