import { createComponent } from '@fluixi/element';
import { FlxSidenav, FlxSidenavBody, FlxSidenavHeader, FlxSidenavFooter, FlxSidenavItem, FlxSidenavToggleEvent, FlxSidenavSection, FlxSidenavSubItems} from '@fluixi/flx-sidenav';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-sidenav/flx-sidenav.js';


const SidenavComponent = createComponent({
    tagName: "flx-sidenav",
    elementClass: FlxSidenav,
    compiler: DOM,
    displayName: "FlxSidenav",
});
const SidenavHeader = createComponent({
    tagName: "flx-sidenav-header",
    elementClass: FlxSidenavHeader,
    compiler: DOM,
    displayName: "FlxSidenavHeader",
});
const SidenavBody = createComponent({
    tagName: "flx-sidenav-body",
    elementClass: FlxSidenavBody,
    compiler: DOM,
    displayName: "FlxSidenavBody",
});
const SidenavFooter = createComponent({
    tagName: "flx-sidenav-footer",
    elementClass: FlxSidenavFooter,
    compiler: DOM,
    displayName: "FlxSidenavFooter",
});
const SidenavSection = createComponent({
    tagName: "flx-sidenav-section",
    elementClass: FlxSidenavSection,
    compiler: DOM,
    displayName: "FlxSidenavSection",
});
const SidenavSubItems = createComponent({
    tagName: "flx-sidenav-subitems",
    elementClass: FlxSidenavSubItems,
    compiler: DOM,
    displayName: "FlxSidenavSubItems",
});
const SidenavItem = createComponent({
    tagName: "flx-sidenav-item",
    elementClass: FlxSidenavItem,
    compiler: DOM,
    displayName: "FlxSidenavItem",
});

export const Sidenav = Object.assign(SidenavComponent, {
    Header: SidenavHeader,
    Body: SidenavBody,
    Footer: SidenavFooter,
    Section: SidenavSection,
    Items: SidenavSubItems,
    Item: Object.assign(SidenavItem, {
        Section: SidenavSection,
        Items: SidenavSubItems
    })
})

export default Sidenav