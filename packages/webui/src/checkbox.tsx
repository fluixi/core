import { createComponent, EventName } from '@fluixi/element';
import { FlxCheckbox, FlxCheckboxChangeEvent} from '@fluixi/flx-checkbox';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-checkbox/flx-checkbox.js';


export const Checkbox = createComponent({
    tagName: "flx-checkbox",
    elementClass: FlxCheckbox,
    compiler: DOM,
    displayName: "FlxCheckbox",
  events: {
    onChange: 'change' as EventName<FlxCheckboxChangeEvent>
  },
});

export default Checkbox