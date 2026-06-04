import { createComponent } from '@fluixi/element';
import { FlxButton} from '@fluixi/flx-button';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-button/flx-button.js';


export const Button = createComponent({
    tagName: "flx-button",
    elementClass: FlxButton,
    compiler: DOM,
    displayName: "FlxButton",
});

export default Button