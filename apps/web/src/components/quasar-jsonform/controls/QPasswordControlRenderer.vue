<template lang="pug">
//control-wrapper(v-bind="controlWrapper" :styles="styles" :isFocused="isFocused" :appliedOptions="appliedOptions")
div.flex.q-col-gutter-sm
  q-input.col(
    :id="control.id + '-input'"
    :disable="!control.enabled"
    :placeholder="appliedOptions.placeholder"
    :label="computedLabel"
    type="password"
    :hint="control.description"
    :error="control.errors !== ''"
    :error-message="control.errors"
    :maxlength="appliedOptions.restrict ? control.schema.maxLength : undefined"
    :clearable="true"
    v-model="password"
    @update:model-value="onChangeControl"
    @focus="isFocused = true"
    @blur="isFocused = false"
    filled
  )
  //- :model-value="control.data"
  q-input.col(
    :id="control.id + '-input'"
    :disable="!control.enabled"
    label="Confirmation"
    type="password"
    :hint="control.description"
    :error="control.errors !== ''"
    :error-message="control.errors"
    v-model="confirm"
    :maxlength="appliedOptions.restrict ? control.schema.maxLength : undefined"
    :clearable="true"
    @update:model-value="onChangeControl"
    @focus="isFocused = true"
    @blur="isFocused = false"
    filled
  )
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue';
import {
  isControl,
  isStringControl,
  rankWith,
} from '@jsonforms/core';
import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { isArray, isObject, isString, iterate } from 'radash';
import type { RendererProps } from '@jsonforms/vue';
import type { ControlElement } from '@jsonforms/core';
import { useQuasarControl } from '../util';
import { ControlWrapper } from '@jsonforms/vue-vanilla';
import { debounce } from 'quasar';

const QPasswordControlRenderer = defineComponent({
  name: 'q-password-control-renderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useQuasarControl(
      useJsonFormsControl(props),
      (value) => isObject(value) ? value.value : value || undefined,
    )
  },
  data: () => ({
    password: ref(''),
    confirm: ref(''),
  }),
  // watch: {
  // 'control.data': {
  //   deep: true,
  //   handler(val) {
  //     this.password = val
  //   },
  // },
  // },
  methods: {
    onChangeControl(val) {
      if (this.password === this.confirm) {
        this.onChange(val)
      } else {
        this.control.errors = 'Mot de passes non identiques'
      }
    },
    isIterable(obj) {
      // checks for null and undefined
      if (obj == null) {
        return false;
      }
      return typeof obj[Symbol.iterator] === 'function';
    },
  },
  computed: {
    computedLabel() {
      return this.control.label === undefined ? this.control.schema.title : this.control.label;
    },
  },
});
export default QPasswordControlRenderer;

</script>
