import { createComponent } from '@fluixi/element';
import { FlxDropdown, FlxDropdownMenu, FlxDropdownBody, FlxDropdownHeader, FlxDropdownFooter, FlxDropdownItem, FlxDropdownToggleEvent} from '@fluixi/flx-dropdown';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-dropdown/flx-dropdown.js';


const DropdownComponent = createComponent({
    tagName: "flx-dropdown",
    elementClass: FlxDropdown,
    compiler: DOM,
    displayName: "FlxDropdown",
});
const DropdownHeader = createComponent({
    tagName: "flx-dropdown-header",
    elementClass: FlxDropdownHeader,
    compiler: DOM,
    displayName: "FlxDropdownHeader",
});
const DropdownMenu = createComponent({
    tagName: "flx-dropdown-menu",
    elementClass: FlxDropdownMenu,
    compiler: DOM,
    displayName: "FlxDropdownMenu",
});
const DropdownBody = createComponent({
    tagName: "flx-dropdown-body",
    elementClass: FlxDropdownBody,
    compiler: DOM,
    displayName: "FlxDropdownBody",
});
const DropdownFooter = createComponent({
    tagName: "flx-dropdown-footer",
    elementClass: FlxDropdownFooter,
    compiler: DOM,
    displayName: "FlxDropdownFooter",
});
const DropdownItem = createComponent({
    tagName: "flx-dropdown-item",
    elementClass: FlxDropdownItem,
    compiler: DOM,
    displayName: "FlxDropdownItem",
});

export const Dropdown = Object.assign(DropdownComponent, {
    Menu: DropdownMenu,
    Header: DropdownHeader,
    Body: DropdownBody,
    Footer: DropdownFooter,
    Item: DropdownItem,
})

export default Dropdown