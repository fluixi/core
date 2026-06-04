import { createComponent } from '@fluixi/element';
import { FlxDrawer, FlxDrawerContent, FlxDrawerHeader} from '@fluixi/flx-drawer';
import DOM from "@fluixi/dom"
import Sidenav from './sidenav';
// import '@fluixi/flx-drawer/flx-drawer.js';


const DrawerComponent = createComponent({
    tagName: "flx-drawer",
    elementClass: FlxDrawer,
    compiler: DOM,
    displayName: "FlxDrawer",
});

export const DrawerContent = createComponent({
    tagName: "flx-drawer-content",
    elementClass: FlxDrawerContent,
    compiler: DOM,
    displayName: "FlxDrawerContent"
});
export const DrawerHeader = createComponent({
    tagName: "flx-drawer-header",
    elementClass: FlxDrawerHeader,
    compiler: DOM,
    displayName: "FlxDrawerHeader"
});


export const Drawer = Object.assign(DrawerComponent, {
    Header: DrawerHeader,
    Content: DrawerContent,
    Nav: Sidenav
})

export default Drawer
