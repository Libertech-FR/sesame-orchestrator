export { default as WysiwygControlRenderer } from './wysiwyg.vue'
export { default as MediaPickerControlRenderer } from './media-picker.vue'

import { entry as wysiwygControlRendererEntry } from './wysiwyg.vue'
import { entry as mediaPickerControlRendererEntry } from './media-picker.vue'

export const advancedRenderers = [
  wysiwygControlRendererEntry,
  mediaPickerControlRendererEntry,
]
