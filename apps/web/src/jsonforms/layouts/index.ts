import { type JsonFormsRendererRegistryEntry, rankWith, isLayout, and, isCategorization, categorizationHasCategory, isControl, optionIs } from '@jsonforms/core'

export { default as VerticalAndHorizontalLayoutRenderer } from './vertical-and-horizontal.vue'
export { default as CategorizationLayoutRenderer } from './categorization.vue'
export { default as GroupLayoutRenderer } from './group.vue'
export { default as ArrayTableLayoutRenderer } from './array-table.vue'

import VerticalAndHorizontalLayoutRendererComponent from './vertical-and-horizontal.vue'
import CategorizationLayoutRendererComponent from './categorization.vue'
import GroupLayoutRendererComponent from './group.vue'
import ArrayTableLayoutRendererComponent from './array-table.vue'

const verticalAndHorizontalRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: VerticalAndHorizontalLayoutRendererComponent,
  tester: rankWith(1, isLayout), // Matches UI elements with layout types (VerticalLayout/HorizontalLayout)
}

const categorizationRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: CategorizationLayoutRendererComponent,
  tester: rankWith(2, and(isCategorization, categorizationHasCategory)),
}

const groupRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: GroupLayoutRendererComponent,
  tester: rankWith(1, (uischema: any) => uischema?.type === 'Group'),
}

const arrayTableRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: ArrayTableLayoutRendererComponent,
  tester: rankWith(30, and(isControl, optionIs('format', 'array-table'))),
}

export const layoutsRenderers = [
  verticalAndHorizontalRendererEntry,
  categorizationRendererEntry,
  groupRendererEntry,
  arrayTableRendererEntry,
]
