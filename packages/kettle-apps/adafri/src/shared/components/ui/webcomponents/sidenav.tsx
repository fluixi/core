import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfSidenav, AdfSidenavBody, AdfSidenavHeader, AdfSidenavFooter, AdfSidenavItem, AdfSidenavToggleEvent} from '@awc/adf-sidenav';
import DOM from "@awc/dom"
// import '@awc/adf-sidenav/adf-sidenav.js';


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
    Item: SidenavItem
})

export default Sidenav