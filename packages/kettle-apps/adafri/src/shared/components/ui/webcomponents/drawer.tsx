import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfDrawer, AdfDrawerContent, AdfDrawerHeader} from '@awc/adf-drawer';
import DOM from "@awc/dom"
// import '@awc/adf-drawer/adf-drawer.js';


const DrawerComponent = createComponent({
    tagName: "adf-drawer",
    elementClass: AdfDrawer,
    compiler: DOM,
    displayName: "AdfDrawer",
});

export const DrawerContent = createComponent({
    tagName: "adf-drawer-content",
    elementClass: AdfDrawerContent,
    compiler: DOM,
    displayName: "AdfDrawerContent"
});
export const DrawerHeader = createComponent({
    tagName: "adf-drawer-header",
    elementClass: AdfDrawerHeader,
    compiler: DOM,
    displayName: "AdfDrawerHeader"
});


export const Drawer = Object.assign(DrawerComponent, {
    Header: DrawerHeader,
    Content: DrawerContent
})

export default Drawer
