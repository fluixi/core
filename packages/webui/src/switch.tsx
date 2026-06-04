import { createComponent, EventName } from '@fluixi/element';
import { FlxSwitch, FlxSwitchChangeEvent} from '@fluixi/flx-switch';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-switch/flx-s@fluixi/flx-switch.js';


export const Switch = createComponent({
    tagName: "flx-switch",
    elementClass: FlxSwitch,
    compiler: DOM,
    displayName: "FlxSwitch",
  events: {
    onChange: 'change' as EventName<FlxSwitchChangeEvent>
  },
});

export default Switch