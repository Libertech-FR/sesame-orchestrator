<template lang="pug">
//control-wrapper(v-bind="controlWrapper" :styles="styles" :isFocused="isFocused" :appliedOptions="appliedOptions")
div
  //- pre(v-html="JSON.stringify(control.data)")
  q-select(
    :model-value="control.data"
    :options="suggestions"
    :input-debounce="0"
    fill-input
    :use-input="suggestions.length === 0"
    use-chips
    :id="control.id + '-input'"
    :disable="!control.enabled"
    :placeholder="appliedOptions.placeholder"
    :label="computedLabel"
    :hint="control.description"
    :error="control.errors !== ''"
    :error-message="control.errors"
    :clearable="true"
    :hide-dropdown-icon="suggestions.length === 0"
    @update:model-value="onChange"
    @focus="isFocused = true"
    @blur="isFocused = false"
    @new-value="createValue"
    filled multiple
  )
  //- q-input(
  //-   v-else
  //-   :id="control.id + '-input'"
  //-   :disable="!control.enabled"
  //-   :placeholder="appliedOptions.placeholder"
  //-   :label="computedLabel"
  //-   :hint="control.description"
  //-   :error="control.errors !== ''"
  //-   :error-message="control.errors"
  //-   :model-value="control.data"
  //-   :maxlength="appliedOptions.restrict ? control.schema.maxLength : undefined"
  //-   :clearable="true"
  //-   @update:model-value="onChange"
  //-   @focus="isFocused = true"
  //-   @blur="isFocused = false"
  //-   filled
  //- )
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

const QStringControlRenderer = defineComponent({
  name: 'q-string-control-renderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useQuasarControl(
      useJsonFormsControl(props),
      (value) => {
        return isObject(value) ? value.value || [] : value || []
      }
    )
  },
  methods: {
    onChange(val) {
      console.log('val', val)
    },
    createValue(val, done) {
      if (!this.control.data) {
        this.control.data = []
        //this.handleChange('', null)
      }
      done(val, 'add-unique')
    },
    isIterable(obj) {
      // checks for null and undefined
      if (obj == null) {
        return false;
      }
      return typeof obj[Symbol.iterator] === 'function';
    }
  },
  computed: {
    suggestions() {
      const suggestions = this.control.uischema.options?.suggestion;

      let everyString = false
      if (this.isIterable(suggestions) && suggestions.length > 0) {
        for (const suggestion of suggestions) {
          if (typeof suggestion !== 'string') {
            everyString = false
            break
          }
          everyString = true
        }
      }

      if (
        suggestions === undefined ||
        !isArray(suggestions) ||
        !everyString
      ) {
        // check for incorrect data
        return [];
      }
      return suggestions;
    },
    computedLabel() {
      return this.control.label === undefined ? this.control.schema.title : this.control.label;
    },
  },
  mounted() {
    if (!this.control.data) {
      this.control.data = []
      //this.handleChange('', null)
    }
  }
});
export default QStringControlRenderer;

</script>
