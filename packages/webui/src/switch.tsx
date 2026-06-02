import { createComponent, EventName } from '@fluixi/element';
import { AdfSwitch, AdfSwitchChangeEvent} from '@awc/adf-switch';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-switch/adf-s@fluixi/adf-switch.js';


export const Switch = createComponent({
    tagName: "adf-switch",
    elementClass: AdfSwitch,
    compiler: DOM,
    displayName: "AdfSwitch",
  events: {
    onChange: 'change' as EventName<AdfSwitchChangeEvent>
  },
});

export default Switch