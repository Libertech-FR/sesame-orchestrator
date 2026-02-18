import { type JsonFormsRendererRegistryEntry, rankWith, and, or, hasOption, optionIs, isStringControl, isPrimitiveArrayControl, isObjectControl } from '@jsonforms/core'

export { default as WysiwygControlRenderer } from './wysiwyg.vue'
export { default as MediaPickerControlRenderer } from './media-picker.vue'

import WysiwygControlRendererComponent from './wysiwyg.vue'
import MediaPickerControlRendererComponent from './media-picker.vue'

const wysiwygControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: WysiwygControlRendererComponent,
  tester: rankWith(2, and(isObjectControl, optionIs('wysiwyg', true))),
}

const mediaPickerControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: MediaPickerControlRendererComponent,
  tester: rankWith(2, and(or(isStringControl, isPrimitiveArrayControl), hasOption('media'))), // Matches string or primitive array controls with 'media' option defined
}

export const advancedRenderers = [
  wysiwygControlRendererEntry,
  mediaPickerControlRendererEntry,
]
