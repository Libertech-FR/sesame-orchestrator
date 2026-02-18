import { type JsonFormsRendererRegistryEntry, rankWith, uiTypeIs } from '@jsonforms/core'

export { default as LabelAdditionalRenderer } from './label.vue'

import LabelAdditionalRendererComponent from './label.vue'

const labelAdditionalRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: LabelAdditionalRendererComponent,
  tester: rankWith(1, uiTypeIs('Label')), // Matches UI elements with type "Label"
}

export const additionalsRenderers = [labelAdditionalRendererEntry]
