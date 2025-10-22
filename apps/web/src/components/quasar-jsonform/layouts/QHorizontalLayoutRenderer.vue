<template lang="pug">
.row
    div(v-for="(element, index) in layout.uischema.elements" :key="`${layout.path}-${index}`" :class="cols[index]").q-px-xs
        dispatch-renderer(:schema="layout.schema" :uischema="element" :path="layout.path" :enabled="layout.enabled" :renderers="layout.renderers" :cells="layout.cells")
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue';
import type { RendererProps, Layout } from '@jsonforms/core';
import { rankWith, uiTypeIs } from '@jsonforms/core';

const QHorizontalLayoutRenderer = defineComponent({
    name: 'q-horizontal-layout-renderer',
    components: {
        DispatchRenderer,
    },
    props: {
        ...rendererProps<Layout>(),
    },
    setup(props: RendererProps<Layout>) {
        const { styles, layout } = useJsonFormsLayout(props);
        return { styles, layout };
    },
    computed: {
        bare(): boolean {
            return !!this.layout.appliedOptions?.bare;
        },
        classes(): string {
            const classes = ['q-pa-none'];
            return classes.join(' ');
        },
        cols(): string[] {
            // Here, you define the logic to determine the column sizes. This can be static, derived from the layout schema, or dynamically calculated.
            // Example static assignment: return this.layout.uischema.elements.map(() => '12');
            // You might want to adjust this logic based on your specific needs, such as responsive design or specific layout requirements.
            return this.layout.uischema.elements.map(() => 'col');
        },
    },
});

export default QHorizontalLayoutRenderer;

</script>
