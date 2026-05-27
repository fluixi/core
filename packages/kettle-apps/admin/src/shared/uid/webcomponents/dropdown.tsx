import { createJsxComponent as createComponent } from '@awc/kettlejs';
import { AdfDropdown, AdfDropdownMenu, AdfDropdownBody, AdfDropdownHeader, AdfDropdownFooter, AdfDropdownItem, AdfDropdownToggleEvent} from '@awc/adf-dropdown';
import DOM from "@awc/dom"
// import '@awc/adf-dropdown/adf-dropdown.js';


const DropdownComponent = createComponent({
    tagName: "adf-dropdown",
    elementClass: AdfDropdown,
    compiler: DOM,
    displayName: "AdfDropdown",
});
const DropdownHeader = createComponent({
    tagName: "adf-dropdown-header",
    elementClass: AdfDropdownHeader,
    compiler: DOM,
    displayName: "AdfDropdownHeader",
});
const DropdownMenu = createComponent({
    tagName: "adf-dropdown-menu",
    elementClass: AdfDropdownMenu,
    compiler: DOM,
    displayName: "AdfDropdownMenu",
});
const DropdownBody = createComponent({
    tagName: "adf-dropdown-body",
    elementClass: AdfDropdownBody,
    compiler: DOM,
    displayName: "AdfDropdownBody",
});
const DropdownFooter = createComponent({
    tagName: "adf-dropdown-footer",
    elementClass: AdfDropdownFooter,
    compiler: DOM,
    displayName: "AdfDropdownFooter",
});
const DropdownItem = createComponent({
    tagName: "adf-dropdown-item",
    elementClass: AdfDropdownItem,
    compiler: DOM,
    displayName: "AdfDropdownItem",
});

export const Dropdown = Object.assign(DropdownComponent, {
    Menu: DropdownMenu,
    Header: DropdownHeader,
    Body: DropdownBody,
    Footer: DropdownFooter,
    Item: DropdownItem,
})

export default Dropdown