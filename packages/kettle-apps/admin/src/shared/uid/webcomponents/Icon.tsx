import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfIcon} from '@awc/adf-icon';
import DOM from "@awc/dom"
// import '@awc/adf-icon/adf-icon.js';


export const Icon = createComponent({
    tagName: "adf-icon",
    elementClass: AdfIcon,
    compiler: DOM,
    displayName: "AdfIcon",
});

export default Icon