<template lang="pug">
div
    q-input(
        :id="control.id + '-input'"
        :disable="!control.enabled"
        :placeholder="appliedOptions.placeholder"
        :label="computedLabel"
        :hint="control.description"
        :error="control.errors !== ''"
        :error-message="control.errors"
        :model-value="parsedValue"
        :mask="dateMask"
        :clearable="true"
        type="date"
        @update:model-value="onChange"
        @focus="isFocused = true"
        @blur="isFocused = false"
        filled
        clearable
    )
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue';
import { isDateControl, rankWith } from '@jsonforms/core';
import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core';
import type { RendererProps } from '@jsonforms/vue';
import type { ControlElement } from '@jsonforms/core';
import { useQuasarControl } from '../util';
import dayjs from 'dayjs';

const QDateControlRenderer = defineComponent({
    name: 'q-date-control-renderer',
    props: {
        ...rendererProps<ControlElement>(),
    },
    setup(props: RendererProps<ControlElement>) {
        return useQuasarControl(
            useJsonFormsControl(props),
            (value) => value ? dayjs(value).format('DD/MM/YYYY') : undefined
        )
    },
    computed: {
        computedLabel() {
            return this.control.label === undefined ? this.control.schema.title : this.control.label;
        },
        parsedValue() {
            return this.control.data ? dayjs(this.control.data, 'DD/MM/YYYY').format('YYYY-MM-DD') : undefined;
        },
        minDate() {
            // Compute the minimum date based on your application's requirements
            return '01/01/1900';
        },
        maxDate() {
            // Compute the maximum date based on your application's requirements
            return '31/12/2099';
        },
        dateMask() {
            // Compute the date mask based on your application's requirements
            return this.appliedOptions?.dateFormat || 'DD/MM/YYYY';
        },
    },
});

export default QDateControlRenderer;
</script>
