import { createComponent } from '@fluixi/element';
import { AdfButton} from '@awc/adf-button';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-button/adf-button.js';


export const Button = createComponent({
    tagName: "adf-button",
    elementClass: AdfButton,
    compiler: DOM,
    displayName: "AdfButton",
});

export default Button