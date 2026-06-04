import { createComponent, withPortal, withSubComponents, EventName } from '@fluixi/element';
import { FlxPopover, FlxPopoverMenu, FlxPopoverToggleEvent} from '@fluixi/flx-popover';
import DOM from "@fluixi/dom"
// import '@fluixi/flx-popover/flx-popover.js';


const PopoverBase = createComponent({
    tagName: "flx-popover",
    elementClass: FlxPopover,
    compiler: DOM,
    displayName: "FlxPopover",
    events: {
        onToggle: 'popover-toggle' as EventName<FlxPopoverToggleEvent>
    }
});

const PopoverMenu = createComponent({
    tagName: "flx-popover-menu",
    elementClass: FlxPopoverMenu,
    compiler: DOM,
    displayName: "FlxPopoverMenu",
});

export const Popover = withSubComponents(withPortal(PopoverBase), {
    Menu: PopoverMenu,
});

export default Popover
