import { createComponent, withPortal, withSubComponents, EventName } from '@awc/element';
import { AdfPopover, AdfPopoverMenu, AdfPopoverToggleEvent} from '@awc/adf-popover';
import DOM from "@awc/dom"
// import '@awc/adf-popover/adf-popover.js';


const PopoverBase = createComponent({
    tagName: "adf-popover",
    elementClass: AdfPopover,
    compiler: DOM,
    displayName: "AdfPopover",
    events: {
        onToggle: 'popover-toggle' as EventName<AdfPopoverToggleEvent>
    }
});

const PopoverMenu = createComponent({
    tagName: "adf-popover-menu",
    elementClass: AdfPopoverMenu,
    compiler: DOM,
    displayName: "AdfPopoverMenu",
});

export const Popover = withSubComponents(withPortal(PopoverBase), {
    Menu: PopoverMenu,
});

export default Popover
