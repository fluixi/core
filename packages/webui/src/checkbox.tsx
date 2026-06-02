import { createComponent, EventName } from '@fluixi/element';
import { AdfCheckbox, AdfCheckboxChangeEvent} from '@awc/adf-checkbox';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-checkbox/adf-checkbox.js';


export const Checkbox = createComponent({
    tagName: "adf-checkbox",
    elementClass: AdfCheckbox,
    compiler: DOM,
    displayName: "AdfCheckbox",
  events: {
    onChange: 'change' as EventName<AdfCheckboxChangeEvent>
  },
});

export default Checkbox