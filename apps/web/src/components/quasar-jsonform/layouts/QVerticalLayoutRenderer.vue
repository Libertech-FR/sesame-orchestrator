<template lang="pug">
q-card(v-if="layout.visible" :class="classes" :flat="bare" :bordered="!bare")
    q-card-section(v-for="(element, index) in layout.uischema.elements" :key="`${layout.path}-${index}`")
        dispatch-renderer(:schema="layout.schema" :uischema="element" :path="layout.path" :enabled="layout.enabled" :renderers="layout.renderers" :cells="layout.cells")
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue';
import type { RendererProps, Layout } from '@jsonforms/core';
import { rankWith, uiTypeIs } from '@jsonforms/core';

const QVerticalLayoutRenderer = defineComponent({
    name: 'q-vertical-layout-renderer',
    components: {
        DispatchRenderer,
    },
    props: {
        ...rendererProps<Layout>(),
    },
    setup(props: RendererProps<Layout>) {
        const { styles, layout } = useJsonFormsLayout(props); // Adjust according to Quasar use cases
        return { styles, layout };
    },
    computed: {
        bare(): boolean {
            return !!this.layout.appliedOptions?.bare;
        },
        classes(): string {
            const classes = ['q-pa-none']; // Adjust class bindings as necessary
            return classes.join(' ');
        },
    },
});

export default QVerticalLayoutRenderer;

</script>
