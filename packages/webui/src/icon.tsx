import { createComponent } from '@fluixi/element';
// import { FlxIcon} from '@fluixi/components/modules';
import { FlxIcon} from '@fluixi/flx-icon';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-icon/flx-icon.js';


export const Icon = createComponent({
    tagName: "flx-icon",
    elementClass: FlxIcon,
    compiler: DOM,
    displayName: "FlxIcon",
});

export default Icon