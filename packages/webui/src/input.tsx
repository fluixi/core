import { createComponent, EventName } from '@fluixi/element';
import { AdfFormField, AdfFormFieldChangedEvent, AdfFormFieldValueChangedEvent} from '@awc/adf-form-field';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-form-field/adf-form-field.js';


export const Input = createComponent({
    tagName: "adf-form-field",
    elementClass: AdfFormField,
    compiler: DOM,
    displayName: "AdfFormField",
  events: {
    onChange: 'change' as EventName<AdfFormFieldChangedEvent>,
    onValueChange: 'valueChange' as EventName<AdfFormFieldValueChangedEvent>,
  },
});

export default Input