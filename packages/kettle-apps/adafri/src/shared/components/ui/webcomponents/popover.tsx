import { createJsxComponent as createComponent, EventName } from '@awc/kettlejs';
import { AdfPopover, AdfPopoverMenu, AdfPopoverToggleEvent} from '@awc/adf-popover';
import DOM from "@awc/dom"
// import '@awc/adf-popover/adf-popover.js';


const PopoverComponent = createComponent({
    tagName: "adf-popover",
    elementClass: AdfPopover,
    compiler: DOM,
    displayName: "AdfPopover",
    events: {
        onToggle: 'toggle' as EventName<AdfPopoverToggleEvent>
    }
});

const PopoverMenu = createComponent({
    tagName: "adf-popover-menu",
    elementClass: AdfPopoverMenu,
    compiler: DOM,
    displayName: "AdfPopoverMenu",
});


export const Popover = Object.assign(PopoverComponent, {
    Menu: PopoverMenu
})

export default Popover