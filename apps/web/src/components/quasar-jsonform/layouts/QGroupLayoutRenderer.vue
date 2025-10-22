<template lang="pug">
q-card(v-if="layout.visible" :class="classes" :flat="bare" :bordered="!bare")
    q-card-section(v-if="layout.label").text-h6
        | {{ layout.label }}
    q-card-section(v-for="(element, index) in layout.uischema.elements" :key="`${layout.path}-${index}`")
        dispatch-renderer(:schema="layout.schema" :uischema="element" :path="layout.path" :enabled="layout.enabled" :renderers="layout.renderers" :cells="layout.cells")
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue';
import type { RendererProps, Layout } from '@jsonforms/core';
import { rankWith, and, isLayout, uiTypeIs } from '@jsonforms/core';

const QGroupLayoutRenderer = defineComponent({
    name: 'q-group-layout-renderer',
    components: {
        DispatchRenderer,
    },
    props: {
        ...rendererProps<Layout>(),
    },
    setup(props: RendererProps<Layout>) {
        // Adapt or replace useVuetifyLayout with a Quasar-specific utility if necessary
        const { styles, layout } = useJsonFormsLayout(props); // Adjust according to Quasar use cases
        return { styles, layout };
    },
    computed: {
        // Update or adjust these computed properties as necessary for Quasar styling
        bare(): boolean {
            return !!this.layout.appliedOptions?.bare;
        },
        classes(): string {
            // Adjust class bindings as necessary to align with Quasar conventions
            const classes = ['q-pa-none'];
            return classes.join(' ');
        },
    },
});

export default QGroupLayoutRenderer;

</script>
