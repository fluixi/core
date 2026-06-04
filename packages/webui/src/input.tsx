import { createComponent, EventName } from '@fluixi/element';
import { FlxFormField, FlxFormFieldChangedEvent, FlxFormFieldValueChangedEvent} from '@fluixi/flx-form-field';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-form-field/flx-form-field.js';


export const Input = createComponent({
    tagName: "flx-form-field",
    elementClass: FlxFormField,
    compiler: DOM,
    displayName: "FlxFormField",
  events: {
    onChange: 'change' as EventName<FlxFormFieldChangedEvent>,
    onValueChange: 'valueChange' as EventName<FlxFormFieldValueChangedEvent>,
  },
});

export default Input