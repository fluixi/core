import { createComponent, EventName } from '@fluixi/element';
import { FlxRadio, FlxRadioChangeEvent} from '@fluixi/flx-radio';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-radio/flx-radio.js';


export const Radio = createComponent({
    tagName: "flx-radio",
    elementClass: FlxRadio,
    compiler: DOM,
    displayName: "FlxRadio",
  events: {
    onChange: 'change' as EventName<FlxRadioChangeEvent>
  },
});

export default Radio