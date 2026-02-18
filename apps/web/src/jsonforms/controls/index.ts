import {
  type ControlElement,
  type JsonFormsRendererRegistryEntry,
  rankWith,
  isStringControl,
  isBooleanControl,
  isDateControl,
  isDateTimeControl,
  isTimeControl,
  isRangeControl,
  isPrimitiveArrayControl,
  isNumberControl,
  isEnumControl,
  isMultiLineControl,
  isIntegerControl,
  hasOption,
  optionIs,
  formatIs,
  and,
  or,
  isObjectArrayControl,
  isObjectControl,
} from '@jsonforms/core'

export { default as ControlWrapper } from '../common/control-wrapper.vue'
export { default as InputControlRenderer } from './input.vue'
export { default as BooleanControlRenderer } from './boolean.vue'
export { default as DateControlRenderer } from './date.vue'
export { default as PasswordControlRenderer } from './password.vue'
export { default as SliderControlRenderer } from './slider.vue'
export { default as EnumAndSuggestionControlRenderer } from './enum-and-suggestion.vue'
export { default as RadioGroupControlRenderer } from './radio-group.vue'
export { default as numericControlRenderer } from './numeric.vue'
export { default as TextareaControlRenderer } from './textarea.vue'
export { default as AutocompleteControlRenderer } from './autocomplete.vue'
export { default as FileUploadControlRenderer } from './file-upload.vue'

import InputControlRendererComponent from './input.vue'
import BooleanControlRendererComponent from './boolean.vue'
import DateControlRendererComponent from './date.vue'
import PasswordControlRendererComponent from './password.vue'
import SliderControlRendererComponent from './slider.vue'
import EnumAndSuggestionControlRendererComponent from './enum-and-suggestion.vue'
import RadioGroupControlRendererComponent from './radio-group.vue'
import NumericControlRendererComponent from './numeric.vue'
import TextareaControlRendererComponent from './textarea.vue'
import AutocompleteControlRendererComponent from './autocomplete.vue'
import FileUploadControlRendererComponent from './file-upload.vue'

const inputControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: InputControlRendererComponent,
  tester: rankWith(1, isStringControl), // Matches schema properties with type "string"
}

const booleanControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: BooleanControlRendererComponent,
  tester: rankWith(1, isBooleanControl), // Matches schema properties with type "boolean"
}

const dateControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: DateControlRendererComponent,
  tester: rankWith(2, or(isDateControl, isDateTimeControl, isTimeControl)), // Matches schema properties with format "date", "date-time" or "time"
}

const passwordControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: PasswordControlRendererComponent,
  tester: rankWith(2, and(isStringControl, formatIs('password'))), // Matches schema properties with format "password"
}

const sliderControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: SliderControlRendererComponent,
  tester: rankWith(4, isRangeControl), // Matches schema properties with type "number" or "integer" and with "range" option set to true
}

const enumAndSuggestionControlRenderer: JsonFormsRendererRegistryEntry = {
  renderer: EnumAndSuggestionControlRendererComponent,
  tester: rankWith(2, or(isPrimitiveArrayControl, and(or(isStringControl, isNumberControl, isBooleanControl), or(hasOption('suggestion'), isEnumControl)))),
}

const radioGroupControlRenderer: JsonFormsRendererRegistryEntry = {
  renderer: RadioGroupControlRendererComponent,
  tester: rankWith(20, and(isEnumControl, optionIs('format', 'radio'))), // Matches enum controls with option format set to 'radio'
}

const numericControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: NumericControlRendererComponent,
  tester: rankWith(1, or(isIntegerControl, isNumberControl)), // Matches schema properties with type "number" or "integer"
}

const textareaControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: TextareaControlRendererComponent,
  tester: rankWith(2, and(isStringControl, isMultiLineControl)), // Matches schema properties with type "string" and with "multiLine" option set to true
}

const autocompleteControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: AutocompleteControlRendererComponent,
  tester: rankWith(2, and(isStringControl, hasOption('api'))), // Matches string controls with 'api' option defined
}

const fileUploadControlRendererEntry: JsonFormsRendererRegistryEntry = {
  renderer: FileUploadControlRendererComponent,
  tester: rankWith(3, and(or(isStringControl, isObjectArrayControl, isObjectControl), optionIs('format', 'file'))), // Rend prioritaire les contrôles string, object ou array avec options.format === 'file'
}

export const controlsRenderers = [
  inputControlRendererEntry,
  booleanControlRendererEntry,
  dateControlRendererEntry,
  passwordControlRendererEntry,
  sliderControlRendererEntry,
  enumAndSuggestionControlRenderer,
  radioGroupControlRenderer,
  numericControlRendererEntry,
  textareaControlRendererEntry,
  autocompleteControlRendererEntry,
  fileUploadControlRendererEntry,
]
