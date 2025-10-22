import { and, isLayout, rankWith, uiTypeIs } from "@jsonforms/core";
import QGroupLayoutRenderer from "./QGroupLayoutRenderer.vue";
import QHorizontalLayoutRenderer from "./QHorizontalLayoutRenderer.vue";
import QVerticalLayoutRenderer from "./QVerticalLayoutRenderer.vue";


const QGroupLayoutRendererEntry = {
    renderer: QGroupLayoutRenderer,
    tester: rankWith(2, and(isLayout, uiTypeIs('Group'))),
};


const QHorizontalLayoutRendererEntry = {
    renderer: QHorizontalLayoutRenderer,
    tester: rankWith(2, uiTypeIs('HorizontalLayout')),
};


const QVerticalLayoutRendererEntry = {
    renderer: QVerticalLayoutRenderer,
    tester: rankWith(2, uiTypeIs('VerticalLayout')),
};

export const LayoutRenderer = [
    QGroupLayoutRendererEntry,
    QHorizontalLayoutRendererEntry,
    QVerticalLayoutRendererEntry
];
