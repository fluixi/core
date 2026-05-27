import { createComponent, EventName } from '@awc/element';
import { AdfRadio, AdfRadioChangeEvent} from '@awc/adf-radio';
import DOM from "@awc/dom"
// import '@awc/adf-radio/adf-radio.js';


export const Radio = createComponent({
    tagName: "adf-radio",
    elementClass: AdfRadio,
    compiler: DOM,
    displayName: "AdfRadio",
  events: {
    onChange: 'change' as EventName<AdfRadioChangeEvent>
  },
});

export default Radio