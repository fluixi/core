import { createComponent } from '@awc/element';
import { AdfIcon} from '@awc/components/modules';
import DOM from "@awc/dom"
// import '@awc/adf-icon/adf-icon.js';


export const Icon = createComponent({
    tagName: "adf-icon",
    elementClass: AdfIcon,
    compiler: DOM,
    displayName: "AdfIcon",
});

export default Icon