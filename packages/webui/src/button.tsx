import { createComponent } from '@awc/element';
import { AdfButton} from '@awc/adf-button';
import DOM from "@awc/dom"
// import '@awc/adf-button/adf-button.js';


export const Button = createComponent({
    tagName: "adf-button",
    elementClass: AdfButton,
    compiler: DOM,
    displayName: "AdfButton",
});

export default Button