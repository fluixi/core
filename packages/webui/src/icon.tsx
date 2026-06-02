import { createComponent } from '@fluixi/element';
import { AdfIcon} from '@awc/components/modules';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-icon/adf-icon.js';


export const Icon = createComponent({
    tagName: "adf-icon",
    elementClass: AdfIcon,
    compiler: DOM,
    displayName: "AdfIcon",
});

export default Icon