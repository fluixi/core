import { createComponent } from '@fluixi/element';
import { AdfSidenav, AdfSidenavBody, AdfSidenavHeader, AdfSidenavFooter, AdfSidenavItem, AdfSidenavToggleEvent, AdfSidenavSection, AdfSidenavSubItems} from '@awc/adf-sidenav';
import DOM from "@fluixi/dom"
// import '@fluixi/adf-sidenav/adf-sidenav.js';


const SidenavComponent = createComponent({
    tagName: "adf-sidenav",
    elementClass: AdfSidenav,
    compiler: DOM,
    displayName: "AdfSidenav",
});
const SidenavHeader = createComponent({
    tagName: "adf-sidenav-header",
    elementClass: AdfSidenavHeader,
    compiler: DOM,
    displayName: "AdfSidenavHeader",
});
const SidenavBody = createComponent({
    tagName: "adf-sidenav-body",
    elementClass: AdfSidenavBody,
    compiler: DOM,
    displayName: "AdfSidenavBody",
});
const SidenavFooter = createComponent({
    tagName: "adf-sidenav-footer",
    elementClass: AdfSidenavFooter,
    compiler: DOM,
    displayName: "AdfSidenavFooter",
});
const SidenavSection = createComponent({
    tagName: "adf-sidenav-section",
    elementClass: AdfSidenavSection,
    compiler: DOM,
    displayName: "AdfSidenavSection",
});
const SidenavSubItems = createComponent({
    tagName: "adf-sidenav-subitems",
    elementClass: AdfSidenavSubItems,
    compiler: DOM,
    displayName: "AdfSidenavSubItems",
});
const SidenavItem = createComponent({
    tagName: "adf-sidenav-item",
    elementClass: AdfSidenavItem,
    compiler: DOM,
    displayName: "AdfSidenavItem",
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