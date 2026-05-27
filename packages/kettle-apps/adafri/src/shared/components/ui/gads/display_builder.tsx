import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfGadsDisplayBuilder} from '@awc/adf-gads-display-builder';
import DOM from "@awc/dom"
// import '@awc/adf-GadsDisplayBuilder/adf-GadsDisplayBuilder.js';


export const GadsDisplayBuilder = createComponent({
    tagName: "adf-gads-display-builder",
    elementClass: AdfGadsDisplayBuilder,
    compiler: DOM,
    displayName: "AdfGadsDisplayBuilder",
});

export default GadsDisplayBuilder