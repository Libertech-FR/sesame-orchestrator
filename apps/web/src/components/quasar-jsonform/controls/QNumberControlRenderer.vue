<template lang="pug">
div
    q-select(
        v-if="suggestions !== undefined"
        :model-value="control.data"
        :options="suggestions"
        :use-input="false"
        :input-debounce="0"
        fill-input
        map-options
        emit-value
        :id="control.id + '-input'"
        :disable="!control.enabled"
        :placeholder="appliedOptions.placeholder"
        :label="computedLabel"
        :hint="control.description"
        :error="control.errors !== ''"
        :error-message="control.errors"
        :clearable="true"
        @update:model-value="onChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        filled
    )
    q-input(
        v-else
        ref="input"
        :step="step"
        :id="control.id + '-input'"
        :disable="!control.enabled"
        :placeholder="appliedOptions.placeholder"
        :label="computedLabel"
        :hint="control.description"
        :error="control.errors !== ''"
        :error-message="control.errors"
        :model-value="control.data"
        :clearable="true"
        @update:model-value="onInputChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        type="number"
        filled
    )
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue';
import { isIntegerControl, isNumberControl, rankWith } from '@jsonforms/core';
import { isArray, isObject, isString, iterate } from 'radash';
import type { ControlElement, JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import { useQuasarControl } from '../util';

const NUMBER_REGEX_TEST = /^[+-]?\d+$/;

const QNumberControlRenderer = defineComponent({
    name: 'q-integer-control-renderer',
    props: {
        ...rendererProps<ControlElement>(),
    },
    setup(props) {
        return useQuasarControl(
            useJsonFormsControl(props),
            (value) => value || undefined
        );
    },
    computed: {
        step(): number {
            return this.control.schema?.step || 1;
        },
        suggestions() {
            return this.control.uischema.options?.suggestion?.map(suggestion => {
                if (typeof suggestion === 'object') return suggestion;
                return { label: suggestion, value: suggestion };
            }) || undefined;
        },
        computedLabel() {
            return this.control.label === undefined ? this.control.schema.title : this.control.label;
        },
    },
    methods: {
        isIterable(obj) {
            // checks for null and undefined
            if (obj == null) {
                return false;
            }
            return typeof obj[Symbol.iterator] === 'function';
        },
        onInputChange(value: string) {
            if (NUMBER_REGEX_TEST.test(value)) {
                this.onChange(parseInt(value, 10));
            } else {
                this.onChange(value);
            }
        },
    },
});

export default QNumberControlRenderer;

</script>
