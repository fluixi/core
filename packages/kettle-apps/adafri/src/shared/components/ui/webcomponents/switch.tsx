import { createJsxComponent as createComponent, EventName } from '@awc/kettlejs';
import { AdfSwitch, AdfSwitchChangeEvent} from '@awc/adf-switch';
import DOM from "@awc/dom"
// import '@awc/adf-switch/adf-s@awc/adf-switch.js';


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